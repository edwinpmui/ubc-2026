const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const usdc = (n) => ethers.parseEther(String(n));

async function signClaim(penny, claimWallet, to) {
  const { chainId } = await ethers.provider.getNetwork();
  const inner = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "address", "address"],
      [chainId, await penny.getAddress(), claimWallet.address, to],
    ),
  );
  return claimWallet.signMessage(ethers.getBytes(inner));
}

describe("Penny", () => {
  let penny, alice, bob, carol, relayer;

  beforeEach(async () => {
    [alice, bob, carol, relayer] = await ethers.getSigners();
    penny = await (await ethers.getContractFactory("Penny")).deploy();
  });

  it("pays directly with a memo", async () => {
    await expect(penny.connect(alice).pay(bob.address, "pizza", { value: usdc(12) }))
      .to.emit(penny, "Payment")
      .withArgs(alice.address, bob.address, usdc(12), "pizza");
  });

  it("moves the funds to the recipient", async () => {
    await expect(penny.connect(alice).pay(bob.address, "", { value: usdc(3) }))
      .to.changeEtherBalances([alice, bob], [usdc(-3), usdc(3)]);
  });

  it("rejects zero payments", async () => {
    await expect(penny.pay(bob.address, "", { value: 0 })).to.be.revertedWithCustomError(penny, "ZeroAmount");
  });

  describe("pay links", () => {
    let claimKey, expiresAt;

    beforeEach(async () => {
      claimKey = ethers.Wallet.createRandom();
      expiresAt = (await time.latest()) + 7 * 86400;
      await penny.connect(alice).createLink(claimKey.address, expiresAt, "welcome!", { value: usdc(5) });
    });

    it("lets a relayer claim on behalf of the recipient", async () => {
      const sig = await signClaim(penny, claimKey, carol.address);
      await expect(penny.connect(relayer).claimLink(claimKey.address, carol.address, sig))
        .to.changeEtherBalance(carol, usdc(5));
      await expect(penny.connect(relayer).claimLink(claimKey.address, carol.address, sig))
        .to.be.revertedWithCustomError(penny, "InvalidLink");
    });

    it("prevents redirecting a claim to another address", async () => {
      const sig = await signClaim(penny, claimKey, carol.address);
      await expect(penny.claimLink(claimKey.address, relayer.address, sig))
        .to.be.revertedWithCustomError(penny, "BadSignature");
    });

    it("refunds the sender on cancel, and only lets others refund after expiry", async () => {
      await expect(penny.connect(bob).cancelLink(claimKey.address)).to.be.revertedWithCustomError(penny, "NotAllowed");
      await time.increaseTo(expiresAt + 1);
      const sig = await signClaim(penny, claimKey, carol.address);
      await expect(penny.claimLink(claimKey.address, carol.address, sig))
        .to.be.revertedWithCustomError(penny, "LinkExpired");
      await expect(penny.connect(bob).cancelLink(claimKey.address)).to.changeEtherBalance(alice, usdc(5));
    });
  });

  describe("splits", () => {
    it("collects each share and forwards it to the creator", async () => {
      await penny.connect(alice).createSplit([bob.address, carol.address], [usdc(10), usdc(15)], "dinner");
      await expect(penny.connect(bob).paySplit(1, { value: usdc(9) })).to.be.revertedWithCustomError(penny, "WrongAmount");
      await expect(penny.connect(bob).paySplit(1, { value: usdc(10) })).to.changeEtherBalance(alice, usdc(10));
      await expect(penny.connect(bob).paySplit(1, { value: usdc(10) })).to.be.revertedWithCustomError(penny, "NotAllowed");
      await penny.connect(carol).paySplit(1, { value: usdc(15) });

      const split = await penny.splits(1);
      expect(split.collected).to.equal(usdc(25));
      expect(split.paid).to.equal(2);
    });

    it("rejects malformed splits", async () => {
      await expect(penny.connect(alice).createSplit([alice.address], [usdc(1)], "")).to.be.revertedWithCustomError(penny, "BadSplit");
      await expect(penny.createSplit([bob.address, bob.address], [usdc(1), usdc(1)], "")).to.be.revertedWithCustomError(penny, "BadSplit");
      await expect(penny.createSplit([], [], "")).to.be.revertedWithCustomError(penny, "BadSplit");
    });
  });
});
