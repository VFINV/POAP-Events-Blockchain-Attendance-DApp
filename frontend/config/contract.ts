// Contract configuration for POAP ERC-1155
// Update these values based on your deployment

export const CONTRACT_ADDRESS = "0xba2cDcC6DECdbEDC4f958CCC1A2B7728792aD763"; // Deployed to Sepolia

export const SUPPORTED_CHAINS = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    name: "Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/",
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia ETH",
      symbol: "ETH",
      decimals: 18,
    },
  },
  ganache: {
    chainId: 31337,
    chainIdHex: "0x7a69",
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

// Set this to 'sepolia' or 'ganache' depending on your environment
export const ACTIVE_NETWORK: keyof typeof SUPPORTED_CHAINS = "sepolia";

export const CONTRACT_ABI = [
  // Events
  "event POAPEventCreated(uint256 indexed tokenId, uint64 maxSupply, uint64 startTime, uint64 endTime, string tokenUri)",
  "event POAPIssued(uint256 indexed tokenId, address indexed attendee, address indexed issuer)",
  "event POAPEventStatusChanged(uint256 indexed tokenId, bool active)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",

  // Read functions
  "function uri(uint256 tokenId) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function getPOAPEvent(uint256 tokenId) view returns (tuple(uint64 startTime, uint64 endTime, uint64 maxSupply, uint64 minted, bool active))",
  "function nextTokenId() view returns (uint256)",
  "function totalIssued() view returns (uint256)",
  "function uniqueHoldersCount() view returns (uint256)",
  "function getCreatedTokenIds() view returns (uint256[])",
  "function getHolderPOAPBalances(address attendee) view returns (uint256[] tokenIds, uint256[] balances)",
  "function owner() view returns (address)",

  // Write functions
  "function createPOAPEvent(string tokenUri, uint64 maxSupply, uint64 startTime, uint64 endTime) returns (uint256)",
  "function issuePOAP(address attendee, uint256 tokenId)",
  "function batchIssuePOAPs(address[] attendees, uint256 tokenId)",
  "function setPOAPEventActive(uint256 tokenId, bool active)",
  "function grantIssuer(address issuer)",
  "function revokeIssuer(address issuer)",
  "function setApprovalForAll(address operator, bool approved)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
];

export const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

// Helper to convert IPFS URI to HTTP URL
export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri) return "";
  if (ipfsUri.startsWith("ipfs://")) {
    return IPFS_GATEWAY + ipfsUri.slice(7);
  }
  if (ipfsUri.startsWith("https://") || ipfsUri.startsWith("http://")) {
    return ipfsUri;
  }
  return IPFS_GATEWAY + ipfsUri;
}
