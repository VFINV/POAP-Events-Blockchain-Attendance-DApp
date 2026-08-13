import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import hre, { network } from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

const CONTRACT_NAME = "AttendanceBadges";

const connection = await network.create();
const deploymentPath = join("deployments", connection.networkName, `${CONTRACT_NAME}.json`);
const deployment = JSON.parse(await readFile(deploymentPath, "utf8")) as {
  contractAddress: string;
  constructorArguments: unknown[];
  explorerUrl?: string | null;
  verifiedAt?: string;
};

console.log(`Verifying ${CONTRACT_NAME} at ${deployment.contractAddress} on ${connection.networkName}`);

await verifyContract(
  {
    address: deployment.contractAddress,
    constructorArgs: deployment.constructorArguments,
    provider: "etherscan",
  },
  hre,
);

deployment.verifiedAt = new Date().toISOString();
await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

console.log("Verification complete");
if (deployment.explorerUrl !== null && deployment.explorerUrl !== undefined) {
  console.log(`Etherscan URL: ${deployment.explorerUrl}`);
}

await connection.close();
