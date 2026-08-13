import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { network } from "hardhat";

const DEFAULT_METADATA_URI = "ipfs://attendance-badges/{id}.json";
const CONTRACT_NAME = "AttendanceBadges";
const ARTIFACT_PATH = "artifacts/contracts/AttendanceBadges.sol/AttendanceBadges.json";

const connection = await network.create();
const { ethers } = connection;
const [deployer] = await ethers.getSigners();
const resolvedNetwork = await ethers.provider.getNetwork();

const initialOwner = process.env.CONTRACT_OWNER_ADDRESS?.trim() || deployer.address;
const defaultUri = process.env.BASE_METADATA_URI?.trim() || DEFAULT_METADATA_URI;

console.log(`Deploying ${CONTRACT_NAME}`);
console.log(`Network: ${connection.networkName} (${resolvedNetwork.chainId})`);
console.log(`Deployer: ${deployer.address}`);
console.log(`Initial owner: ${initialOwner}`);
console.log(`Default URI: ${defaultUri}`);

const contract = await ethers.deployContract(CONTRACT_NAME, [initialOwner, defaultUri], deployer);
const deploymentTx = contract.deploymentTransaction();

await contract.waitForDeployment();

const contractAddress = await contract.getAddress();
const receipt = deploymentTx === null ? null : await deploymentTx.wait();
const artifact = JSON.parse(await readFile(ARTIFACT_PATH, "utf8")) as { abi: unknown };
const chainId = resolvedNetwork.chainId.toString();
const deployedAt = new Date().toISOString();
const explorerUrl = chainId === "11155111" ? `https://sepolia.etherscan.io/address/${contractAddress}` : null;

const deployment = {
  contractName: CONTRACT_NAME,
  network: connection.networkName,
  chainId,
  contractAddress,
  deployer: deployer.address,
  transactionHash: deploymentTx?.hash ?? null,
  blockNumber: receipt?.blockNumber ?? null,
  deployedAt,
  constructorArguments: [initialOwner, defaultUri],
  explorerUrl,
  abi: artifact.abi,
};

const deploymentPath = join("deployments", connection.networkName, `${CONTRACT_NAME}.json`);
const abiPath = join("deployments", connection.networkName, `${CONTRACT_NAME}.abi.json`);

await mkdir(dirname(deploymentPath), { recursive: true });
await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
await writeFile(abiPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);

console.log(`${CONTRACT_NAME} deployed to ${contractAddress}`);
console.log(`Deployment metadata written to ${deploymentPath}`);
console.log(`ABI written to ${abiPath}`);

if (explorerUrl !== null) {
  console.log(`Etherscan URL: ${explorerUrl}`);
}

await connection.close();
