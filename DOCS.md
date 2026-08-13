# Core Technical Implementation Requirements

The primary objective of this prototype is to issue digital attendance badges as NFTs on the blockchain.

## B1. Smart Contract Development & Security

- **Solidity Stack:** Code must use Solidity ^0.8.x. Mandatory inclusion of an SPDX license identifier and pragma version on every file.
- **Token Economy:** Implement an explicit token standard ERC-1155 with a clear separation of responsibilities.
- **Logic Requirements:** Include an onlyOwner access modifier, state mappings or arrays, ≥2 events, and strict input validation via require() or revert().
- **Security Patterns:** Explicitly implement and tag ≥3 distinct design patterns: Checks-Effects-Interactions (CEI), Reentrancy Guard, and Role-Based Access Control (RBAC). Flag vulnerabilities/safeguards with a `//SECURITY:` comment.
- **Gas & Optimization:** Use struct packing, calldata for read-only arguments, and strict view/pure state mutability.
- **Code Quality:** Write full NatSpec comments on all public functions, resolve all compiler warnings, and eliminate magic numbers by using constants.

## B2. Deployment

- **Target Network:** Deploy to the Ethereum Sepolia Testnet. Contract must be Etherscan-verified and a live URL provided.
- **Artefacts:** Submit compiled ABI JSON, deployment script, finalized contract address, and parameterised environment configuration files (switching testnet vs local).

## B3. Testing & Validation

- **Framework & Coverage:** Build an automated unit test suite via Hardhat securing ≥90% function coverage.
- **Test Matrix:** Cover all happy-paths, all custom revert/exception conditions, access-control boundaries, and multi-account state simulations.
- **Reporting:** Package a structured test matrix table (Function, Input, Expected, Actual, Pass/Fail), raw output benchmarking gas per function, stress/integration data, and written explanations for deliberate failures.

## B4. Front-End & Integration

- **Frontend:** Build a simple, responsive interface.
- **MetaMask Actions:** Connect dynamically to MetaMask, display the current wallet address, and provide interface execution triggers for ≥1 read and ≥1 write function.
- **UX Requirements:** Enforce real-time network validation checks, render transaction pending/confirmed status loops, and display user-readable revert error strings.
- **Architecture:** Abstract contract configurations (ABIs/Addresses) into external structures like a .env or config.js file. Handle all promise rejections gracefully. Provide clear startup steps in the repository README.

## User Stories

### User Story 1: Admin Issuing a POAP (Write Operation)

As an event administrator (onlyOwner),
I want to input an attendee's wallet address and execute a mint function,
So that the attendee receives a digital attendance badge as an NFT.

**Acceptance Criteria:**

- Admin inputs valid address and clicks "Issue POAP".
- MetaMask prompts to sign and pay gas for the transaction.
- UI displays a "Transaction Pending" spinner.
- Upon block confirmation, UI displays a success message and updates the state without requiring a manual page refresh.

### User Story 2: Attendee Verification (Read Operation)

As an event attendee,
I want to query the smart contract,
So that I can view the balance and IDs of the POAP NFTs I currently hold.

**Acceptance Criteria:**

- User clicks "Check POAP Balance".
- Application executes a read-only call (e.g., `balanceOf()` or `ownerOf()`) without prompting MetaMask for gas fees.
- UI immediately renders the returned data array.

## Backend Implementation Plan

### Scope

This backend prototype covers the smart contract, deployment automation, environment configuration, verification artefacts, and automated test/report outputs required to issue POAP-style attendance badges as ERC-1155 NFTs on Sepolia. Front-end implementation is intentionally out of scope for this section.

### Phase 1: Project Setup

- Initialize or confirm a Hardhat-based Solidity workspace.
- Install required backend dependencies:
  - `hardhat`
  - `@nomicfoundation/hardhat-toolbox`
  - `@openzeppelin/contracts`
  - `dotenv`
- Configure Hardhat for:
  - local Hardhat network
  - Sepolia testnet
  - Etherscan verification
  - Solidity `^0.8.x` compiler settings with optimizer enabled
- Add parameterized environment files:
  - `.env.example` for required variables
  - `.env` ignored by git
- Required environment variables:
  - `SEPOLIA_RPC_URL`
  - `PRIVATE_KEY`
  - `ETHERSCAN_API_KEY`
  - `CONTRACT_OWNER_ADDRESS`
  - optional base metadata URI settings

### Phase 2: Smart Contract Implementation

Create an ERC-1155 POAP contract with the following responsibilities:

- inherit from OpenZeppelin ERC-1155 ownership/access-control utilities where appropriate
- expose owner/admin-only minting for event attendance badges
- maintain event/badge metadata in packed structs
- track issued token IDs and attendee balances through mappings/arrays
- expose read functions for attendee verification
- emit at least two domain events, such as:
  - `POAPEventCreated`
  - `POAPIssued`
- enforce strict validation with `require()` or custom errors for:
  - zero addresses
  - invalid token IDs
  - duplicate or invalid event creation
  - unauthorized minting
  - empty metadata URI or invalid supply constraints

Required contract-level implementation details:

- SPDX identifier and Solidity pragma on every Solidity file
- full NatSpec comments on all public/external functions
- `onlyOwner` access modifier usage for administrative write paths
- explicit constants instead of magic numbers
- calldata for read-only external arguments where applicable
- strict `view`/`pure` annotations
- no compiler warnings

Security requirements to tag directly in code using `//SECURITY:` comments:

- Checks-Effects-Interactions pattern
- Reentrancy Guard on state-changing mint/admin paths where applicable
- Role-Based Access Control or owner-gated authorization
- input validation safeguards
- any deliberate design limitation relevant to the prototype

### Phase 3: Backend Read/Write Contract API

Implement the minimum backend contract API needed by the prototype:

- write/admin functions:
  - create or register a POAP event/badge type
  - mint/issue a POAP token to an attendee wallet
  - optionally batch issue POAPs if time permits
- read functions:
  - get event/badge metadata by token ID
  - check whether a wallet holds a given POAP token ID
  - return issued token IDs or a wallet's relevant POAP balances, subject to gas-safe limits
  - expose standard ERC-1155 `balanceOf()` / `balanceOfBatch()`

### Phase 4: Deployment Automation

Add deployment scripts that:

- read constructor/configuration values from environment variables
- deploy to local Hardhat network and Sepolia
- persist deployment output to a structured artefact file containing:
  - network name
  - chain ID
  - contract address
  - deployer address
  - transaction hash
  - deployment timestamp
  - constructor arguments
- support Etherscan verification using Hardhat's verify task

Expected deployment artefacts:

- compiled ABI JSON
- deployment script
- finalized Sepolia contract address
- verified Etherscan contract URL
- generated deployment metadata JSON

### Phase 5: Automated Testing

Build a Hardhat test suite targeting at least 90% function coverage.

Test coverage must include:

- successful contract deployment
- correct owner/admin initialization
- successful POAP event creation
- successful mint/issue flow by owner
- attendee balance verification through ERC-1155 reads
- emitted event assertions
- zero address rejection
- invalid token ID rejection
- unauthorized caller rejection
- duplicate or invalid event creation rejection
- multi-account minting and balance simulations
- deliberate revert/error cases with expected messages or custom errors

Testing outputs to generate or document:

- structured test matrix table with Function, Input, Expected, Actual, Pass/Fail
- raw test command output
- gas usage per important function
- short explanation of deliberate failure tests

### Phase 6: Backend Validation Checklist

Before marking the backend prototype complete, verify that:

- all Solidity files compile without warnings
- all public/external functions include NatSpec
- contract includes at least three tagged security patterns
- ERC-1155 behavior is standards-compatible
- owner/admin boundaries are enforced
- all expected revert paths are tested
- function coverage is at least 90%
- Sepolia deployment succeeds
- Etherscan verification succeeds
- ABI and deployment artefacts are committed or packaged
- README backend startup/deployment steps are updated

### Prototype Completion Criteria

The backend prototype is complete when the repository contains:

- a production-readable ERC-1155 POAP Solidity contract
- Hardhat configuration for local and Sepolia networks
- deployment and verification scripts
- parameterized environment configuration templates
- compiled ABI artefact
- Sepolia contract address and Etherscan URL
- automated test suite with at least 90% function coverage
- test matrix, gas report, and deliberate failure explanation
