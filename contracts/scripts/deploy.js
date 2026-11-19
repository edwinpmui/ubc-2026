const { ethers, network } = require("hardhat");

async function main() {
  const existing = process.env.SKIP_IF_DEPLOYED_AT;
  if (existing && (await ethers.provider.getCode(existing)) !== "0x") {
    console.log(`Penny already deployed at ${existing} on ${network.name}`);
    return;
  }

  const penny = await (await ethers.getContractFactory("Penny")).deploy();
  await penny.waitForDeployment();
  console.log(`Penny deployed to ${await penny.getAddress()} on ${network.name}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
