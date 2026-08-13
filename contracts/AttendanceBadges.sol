// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/// @title POAP Events
/// @author POAP Events Prototype
/// @notice Issues event-attendance badges as ERC-1155 tokens for a prototype POAP backend.
/// @dev SECURITY: Uses Ownable and AccessControl for Role-Based Access Control (RBAC).
contract AttendanceBadges is ERC1155, ERC1155Supply, Ownable, AccessControl, ReentrancyGuard {
  /// @notice Role allowed to issue existing POAP badges.
  bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

  /// @notice First token ID assigned by this contract.
  uint256 public constant FIRST_TOKEN_ID = 1;

  /// @notice Maximum number of token IDs returned by holder enumeration helpers.
  uint256 public constant MAX_TRACKED_TOKENS_PER_QUERY = 100;

  /// @notice Packed event configuration and minting counters.
  /// @dev Four uint64 values fit into one storage slot; bool is kept separate for clarity.
  struct POAPEvent {
    uint64 startTime;
    uint64 endTime;
    uint64 maxSupply;
    uint64 minted;
    bool active;
  }

  uint256 private _nextTokenId = FIRST_TOKEN_ID;
  uint256[] private _createdTokenIds;
  uint256 private _totalIssued;
  uint256 private _uniqueHoldersCount;

  mapping(uint256 tokenId => POAPEvent poapEvent) private _poapEvents;
  mapping(uint256 tokenId => string tokenUri) private _tokenUris;
  mapping(uint256 tokenId => bool created) private _created;
  mapping(address holder => uint256[] tokenIds) private _holderTokenIds;
  mapping(address holder => mapping(uint256 tokenId => bool tracked)) private _holderTokenTracked;
  mapping(address holder => bool isHolder) private _isHolder;

  /// @notice Emitted when an owner creates a new POAP badge type.
  /// @param tokenId The ERC-1155 token ID for the badge type.
  /// @param maxSupply Maximum number of badges that may be issued.
  /// @param startTime Event start timestamp.
  /// @param endTime Event end timestamp.
  /// @param tokenUri Metadata URI for the badge type.
  event POAPEventCreated(uint256 indexed tokenId, uint64 maxSupply, uint64 startTime, uint64 endTime, string tokenUri);

  /// @notice Emitted when a POAP badge is issued to an attendee.
  /// @param tokenId The ERC-1155 token ID issued.
  /// @param attendee Recipient wallet address.
  /// @param issuer Account that issued the badge.
  event POAPIssued(uint256 indexed tokenId, address indexed attendee, address indexed issuer);

  /// @notice Emitted when a POAP badge type is enabled or disabled.
  /// @param tokenId The ERC-1155 token ID updated.
  /// @param active Whether the badge type can currently be issued.
  event POAPEventStatusChanged(uint256 indexed tokenId, bool active);

  /// @dev SECURITY: RBAC check centralizes owner-or-issuer authorization for minting.
  modifier onlyIssuer() {
    require(owner() == _msgSender() || hasRole(ISSUER_ROLE, _msgSender()), "POAP: caller is not issuer");
    _;
  }

  /// @notice Initializes the ERC-1155 POAP contract.
  /// @param initialOwner Owner/admin address for privileged operations.
  /// @param defaultUri Fallback ERC-1155 metadata URI.
  constructor(address initialOwner, string memory defaultUri) ERC1155(defaultUri) Ownable(initialOwner) {
    require(initialOwner != address(0), "POAP: owner is zero address");
    require(bytes(defaultUri).length > 0, "POAP: default URI is empty");

    _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
    _grantRole(ISSUER_ROLE, initialOwner);
  }

  /// @notice Creates a new POAP badge type.
  /// @dev SECURITY: onlyOwner is explicit RBAC for administrative event creation.
  /// @param tokenUri Metadata URI for this badge type.
  /// @param maxSupply Maximum supply that may be issued for this badge type.
  /// @param startTime Event start timestamp.
  /// @param endTime Event end timestamp.
  /// @return tokenId Newly assigned ERC-1155 token ID.
  function createPOAPEvent(
    string calldata tokenUri,
    uint64 maxSupply,
    uint64 startTime,
    uint64 endTime
  ) external onlyOwner returns (uint256 tokenId) {
    require(bytes(tokenUri).length > 0, "POAP: token URI is empty");
    require(maxSupply > 0, "POAP: max supply is zero");
    require(startTime < endTime, "POAP: invalid event window");

    tokenId = _nextTokenId;
    _nextTokenId = tokenId + 1;

    _created[tokenId] = true;
    _poapEvents[tokenId] = POAPEvent({startTime: startTime, endTime: endTime, maxSupply: maxSupply, minted: 0, active: true});
    _tokenUris[tokenId] = tokenUri;
    _createdTokenIds.push(tokenId);

    emit POAPEventCreated(tokenId, maxSupply, startTime, endTime, tokenUri);
  }

  /// @notice Issues one POAP badge to an attendee wallet.
  /// @dev SECURITY: Implements Checks-Effects-Interactions (CEI); state is updated before `_mint` acceptance callbacks.
  /// @dev SECURITY: nonReentrant protects this write path from callback-based reentry.
  /// @param attendee Wallet that will receive the POAP badge.
  /// @param tokenId ERC-1155 token ID to issue.
  function issuePOAP(address attendee, uint256 tokenId) external onlyIssuer nonReentrant {
    _issuePOAP(attendee, tokenId);
  }

  /// @notice Issues the same POAP badge to multiple attendee wallets.
  /// @dev SECURITY: nonReentrant protects batch minting from receiver callback reentry.
  /// @param attendees Wallets that will receive the POAP badge.
  /// @param tokenId ERC-1155 token ID to issue.
  function batchIssuePOAPs(address[] calldata attendees, uint256 tokenId) external onlyIssuer nonReentrant {
    require(attendees.length > 0, "POAP: no attendees");
    require(_created[tokenId], "POAP: token does not exist");
    require(_poapEvents[tokenId].minted + attendees.length <= _poapEvents[tokenId].maxSupply, "POAP: max supply reached");

    for (uint256 i = 0; i < attendees.length; i++) {
      _issuePOAP(attendees[i], tokenId);
    }
  }

  /// @notice Sets whether a POAP badge type can be issued.
  /// @dev SECURITY: onlyOwner restricts administrative status changes.
  /// @param tokenId ERC-1155 token ID to update.
  /// @param active Whether issuing should be enabled.
  function setPOAPEventActive(uint256 tokenId, bool active) external onlyOwner {
    require(_created[tokenId], "POAP: token does not exist");

    _poapEvents[tokenId].active = active;

    emit POAPEventStatusChanged(tokenId, active);
  }

  /// @notice Grants issuer permissions to an account.
  /// @dev SECURITY: onlyOwner controls role assignment for issuer RBAC.
  /// @param issuer Account to grant issuer role.
  function grantIssuer(address issuer) external onlyOwner {
    require(issuer != address(0), "POAP: issuer is zero address");
    _grantRole(ISSUER_ROLE, issuer);
  }

  /// @notice Revokes issuer permissions from an account.
  /// @dev SECURITY: onlyOwner controls role revocation for issuer RBAC.
  /// @param issuer Account to revoke issuer role.
  function revokeIssuer(address issuer) external onlyOwner {
    require(issuer != address(0), "POAP: issuer is zero address");
    _revokeRole(ISSUER_ROLE, issuer);
  }

  /// @notice Returns configured POAP event details for a token ID.
  /// @param tokenId ERC-1155 token ID to inspect.
  /// @return poapEvent Packed event configuration and mint count.
  function getPOAPEvent(uint256 tokenId) external view returns (POAPEvent memory poapEvent) {
    require(_created[tokenId], "POAP: token does not exist");
    return _poapEvents[tokenId];
  }

  /// @notice Checks whether a wallet currently holds a POAP badge.
  /// @param attendee Wallet address to inspect.
  /// @param tokenId ERC-1155 token ID to check.
  /// @return hasBadge True when attendee owns at least one unit of the badge.
  function hasPOAP(address attendee, uint256 tokenId) external view returns (bool hasBadge) {
    require(attendee != address(0), "POAP: attendee is zero address");
    require(_created[tokenId], "POAP: token does not exist");
    return balanceOf(attendee, tokenId) > 0;
  }

  /// @notice Returns all POAP token IDs created by this contract.
  /// @return tokenIds Array of created ERC-1155 token IDs.
  function getCreatedTokenIds() external view returns (uint256[] memory tokenIds) {
    return _createdTokenIds;
  }

  /// @notice Returns tracked POAP token IDs held by an attendee.
  /// @dev The helper is intentionally bounded for prototype gas safety.
  /// @param attendee Wallet address to inspect.
  /// @return tokenIds Token IDs tracked for the attendee.
  function getHolderTokenIds(address attendee) external view returns (uint256[] memory tokenIds) {
    require(attendee != address(0), "POAP: attendee is zero address");
    require(_holderTokenIds[attendee].length <= MAX_TRACKED_TOKENS_PER_QUERY, "POAP: too many tracked tokens");
    return _holderTokenIds[attendee];
  }

  /// @notice Returns tracked POAP token IDs and balances for an attendee.
  /// @dev Uses standard ERC-1155 balances over tracked token IDs for frontend-friendly reads.
  /// @param attendee Wallet address to inspect.
  /// @return tokenIds Token IDs tracked for the attendee.
  /// @return balances Current ERC-1155 balances for each token ID.
  function getHolderPOAPBalances(address attendee) external view returns (uint256[] memory tokenIds, uint256[] memory balances) {
    require(attendee != address(0), "POAP: attendee is zero address");
    require(_holderTokenIds[attendee].length <= MAX_TRACKED_TOKENS_PER_QUERY, "POAP: too many tracked tokens");

    tokenIds = _holderTokenIds[attendee];
    balances = new uint256[](tokenIds.length);

    for (uint256 i = 0; i < tokenIds.length; i++) {
      balances[i] = balanceOf(attendee, tokenIds[i]);
    }
  }

  /// @notice Returns whether a POAP token ID has been created.
  /// @param tokenId ERC-1155 token ID to inspect.
  /// @return created True when the token ID is registered as a POAP badge type.
  function isCreatedToken(uint256 tokenId) external view returns (bool created) {
    return _created[tokenId];
  }

  /// @notice Returns the metadata URI for a POAP token ID.
  /// @param tokenId ERC-1155 token ID to inspect.
  /// @return tokenUri Metadata URI associated with the token ID.
  function uri(uint256 tokenId) public view override returns (string memory tokenUri) {
    require(_created[tokenId], "POAP: token does not exist");
    return _tokenUris[tokenId];
  }

  /// @notice Returns the next token ID that will be assigned.
  /// @return tokenId Next ERC-1155 token ID.
  function nextTokenId() external view returns (uint256 tokenId) {
    return _nextTokenId;
  }

  /// @notice Returns the total number of POAPs issued across all events.
  /// @return count Total issued POAPs.
  function totalIssued() external view returns (uint256 count) {
    return _totalIssued;
  }

  /// @notice Returns the total number of unique addresses that hold at least one POAP.
  /// @return count Total unique holders.
  function uniqueHoldersCount() external view returns (uint256 count) {
    return _uniqueHoldersCount;
  }

  /// @inheritdoc ERC1155
  function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /// @inheritdoc ERC1155Supply
  function _update(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory values
  ) internal override(ERC1155, ERC1155Supply) {
    super._update(from, to, ids, values);
  }

  function _issuePOAP(address attendee, uint256 tokenId) private {
    require(attendee != address(0), "POAP: attendee is zero address");
    require(_created[tokenId], "POAP: token does not exist");

    POAPEvent storage poapEvent = _poapEvents[tokenId];
    require(poapEvent.active, "POAP: event inactive");
    require(poapEvent.minted < poapEvent.maxSupply, "POAP: max supply reached");
    require(balanceOf(attendee, tokenId) == 0, "POAP: attendee already issued");

    poapEvent.minted += 1;
    _totalIssued += 1;
    _trackHolderToken(attendee, tokenId);

    _mint(attendee, tokenId, 1, "");

    emit POAPIssued(tokenId, attendee, _msgSender());
  }

  function _trackHolderToken(address attendee, uint256 tokenId) private {
    if (!_isHolder[attendee]) {
      _isHolder[attendee] = true;
      _uniqueHoldersCount += 1;
    }

    if (!_holderTokenTracked[attendee][tokenId]) {
      _holderTokenTracked[attendee][tokenId] = true;
      _holderTokenIds[attendee].push(tokenId);
    }
  }
}
