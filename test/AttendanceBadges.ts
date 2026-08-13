import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const DEFAULT_URI = "ipfs://attendance-badges/{id}.json";
const EVENT_URI = "ipfs://attendance-badges/1.json";
const START_TIME = 1_700_000_000n;
const END_TIME = 1_700_086_400n;
const MAX_SUPPLY = 3n;

async function deployAttendanceBadges() {
  const [owner, issuer, attendee, secondAttendee, thirdAttendee, stranger] = await ethers.getSigners();
  const badges = await ethers.deployContract("AttendanceBadges", [owner.address, DEFAULT_URI], owner);

  return { badges, owner, issuer, attendee, secondAttendee, thirdAttendee, stranger };
}

async function createDefaultEvent(badges: any) {
  const tokenId = await badges.nextTokenId();
  await badges.createPOAPEvent(EVENT_URI, MAX_SUPPLY, START_TIME, END_TIME);
  return tokenId;
}

describe("AttendanceBadges", function () {
  describe("deployment", function () {
    it("initializes owner, issuer role, ERC-1155 interface, and next token ID", async function () {
      const { badges, owner } = await deployAttendanceBadges();

      expect(await badges.owner()).to.equal(owner.address);
      expect(await badges.nextTokenId()).to.equal(1n);
      expect(await badges.hasRole(await badges.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(true);
      expect(await badges.hasRole(await badges.ISSUER_ROLE(), owner.address)).to.equal(true);
      expect(await badges.supportsInterface("0xd9b67a26")).to.equal(true);
    });

    it("rejects invalid constructor arguments", async function () {
      const { badges, owner } = await deployAttendanceBadges();

      await expect(
        ethers.deployContract("AttendanceBadges", [ethers.ZeroAddress, DEFAULT_URI], owner),
      ).to.be.revertedWithCustomError(badges, "OwnableInvalidOwner");
      await expect(ethers.deployContract("AttendanceBadges", [owner.address, ""], owner)).to.be.revertedWith(
        "POAP: default URI is empty",
      );
    });
  });

  describe("event creation", function () {
    it("creates a badge type and exposes its metadata", async function () {
      const { badges } = await deployAttendanceBadges();
      const tokenId = await badges.nextTokenId();

      await expect(badges.createPOAPEvent(EVENT_URI, MAX_SUPPLY, START_TIME, END_TIME))
        .to.emit(badges, "POAPEventCreated")
        .withArgs(tokenId, MAX_SUPPLY, START_TIME, END_TIME, EVENT_URI);

      const eventDetails = await badges.getPOAPEvent(tokenId);
      expect(eventDetails.startTime).to.equal(START_TIME);
      expect(eventDetails.endTime).to.equal(END_TIME);
      expect(eventDetails.maxSupply).to.equal(MAX_SUPPLY);
      expect(eventDetails.minted).to.equal(0n);
      expect(eventDetails.active).to.equal(true);
      expect(await badges.uri(tokenId)).to.equal(EVENT_URI);
      expect(await badges.isCreatedToken(tokenId)).to.equal(true);
      expect(await badges.getCreatedTokenIds()).to.deep.equal([tokenId]);
      expect(await badges.nextTokenId()).to.equal(tokenId + 1n);
    });

    it("rejects invalid event creation input", async function () {
      const { badges } = await deployAttendanceBadges();

      await expect(badges.createPOAPEvent("", MAX_SUPPLY, START_TIME, END_TIME)).to.be.revertedWith(
        "POAP: token URI is empty",
      );
      await expect(badges.createPOAPEvent(EVENT_URI, 0, START_TIME, END_TIME)).to.be.revertedWith(
        "POAP: max supply is zero",
      );
      await expect(badges.createPOAPEvent(EVENT_URI, MAX_SUPPLY, END_TIME, START_TIME)).to.be.revertedWith(
        "POAP: invalid event window",
      );
    });

    it("restricts event creation and status changes to the owner", async function () {
      const { badges, stranger } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);

      await expect(
        badges.connect(stranger).createPOAPEvent(EVENT_URI, MAX_SUPPLY, START_TIME, END_TIME),
      ).to.be.revertedWithCustomError(badges, "OwnableUnauthorizedAccount");
      await expect(badges.connect(stranger).setPOAPEventActive(tokenId, false)).to.be.revertedWithCustomError(
        badges,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("issuing badges", function () {
    it("allows the owner to issue a POAP and updates attendee reads", async function () {
      const { badges, owner, attendee } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);

      await expect(badges.issuePOAP(attendee.address, tokenId))
        .to.emit(badges, "POAPIssued")
        .withArgs(tokenId, attendee.address, owner.address);

      expect(await badges.balanceOf(attendee.address, tokenId)).to.equal(1n);
      expect(await badges.hasPOAP(attendee.address, tokenId)).to.equal(true);
      expect(await badges.getHolderTokenIds(attendee.address)).to.deep.equal([tokenId]);

      const [tokenIds, balances] = await badges.getHolderPOAPBalances(attendee.address);
      expect(tokenIds).to.deep.equal([tokenId]);
      expect(balances).to.deep.equal([1n]);

      const eventDetails = await badges.getPOAPEvent(tokenId);
      expect(eventDetails.minted).to.equal(1n);
    });

    it("allows an owner-granted issuer to issue badges", async function () {
      const { badges, owner, issuer, attendee } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);

      await badges.connect(owner).grantIssuer(issuer.address);

      await expect(badges.connect(issuer).issuePOAP(attendee.address, tokenId))
        .to.emit(badges, "POAPIssued")
        .withArgs(tokenId, attendee.address, issuer.address);

      expect(await badges.balanceOf(attendee.address, tokenId)).to.equal(1n);
    });

    it("batch issues one POAP to multiple attendees", async function () {
      const { badges, attendee, secondAttendee, thirdAttendee } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);
      const attendees = [attendee.address, secondAttendee.address, thirdAttendee.address];

      await badges.batchIssuePOAPs(attendees, tokenId);

      expect(await badges.balanceOfBatch(attendees, [tokenId, tokenId, tokenId])).to.deep.equal([1n, 1n, 1n]);
      expect((await badges.getPOAPEvent(tokenId)).minted).to.equal(3n);
    });

    it("rejects invalid issue attempts", async function () {
      const { badges, attendee, secondAttendee, stranger } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);

      await expect(badges.connect(stranger).issuePOAP(attendee.address, tokenId)).to.be.revertedWith(
        "POAP: caller is not issuer",
      );
      await expect(badges.issuePOAP(ethers.ZeroAddress, tokenId)).to.be.revertedWith("POAP: attendee is zero address");
      await expect(badges.issuePOAP(attendee.address, 999n)).to.be.revertedWith("POAP: token does not exist");

      await badges.issuePOAP(attendee.address, tokenId);
      await expect(badges.issuePOAP(attendee.address, tokenId)).to.be.revertedWith("POAP: attendee already issued");

      await badges.setPOAPEventActive(tokenId, false);
      await expect(badges.issuePOAP(secondAttendee.address, tokenId)).to.be.revertedWith("POAP: event inactive");
    });

    it("enforces max supply for single and batch issue flows", async function () {
      const { badges, attendee, secondAttendee, thirdAttendee, stranger } = await deployAttendanceBadges();
      const limitedTokenId = await badges.nextTokenId();
      await badges.createPOAPEvent(EVENT_URI, 1, START_TIME, END_TIME);

      await badges.issuePOAP(attendee.address, limitedTokenId);
      await expect(badges.issuePOAP(secondAttendee.address, limitedTokenId)).to.be.revertedWith(
        "POAP: max supply reached",
      );

      const batchTokenId = await badges.nextTokenId();
      await badges.createPOAPEvent("ipfs://attendance-badges/batch.json", 2, START_TIME, END_TIME);
      await expect(
        badges.batchIssuePOAPs([secondAttendee.address, thirdAttendee.address, stranger.address], batchTokenId),
      ).to.be.revertedWith("POAP: max supply reached");
    });

    it("rejects invalid batch issue input", async function () {
      const { badges } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);

      await expect(badges.batchIssuePOAPs([], tokenId)).to.be.revertedWith("POAP: no attendees");
      await expect(badges.batchIssuePOAPs([ethers.ZeroAddress], tokenId)).to.be.revertedWith(
        "POAP: attendee is zero address",
      );
    });
  });

  describe("admin roles and read validation", function () {
    it("grants and revokes issuer permissions", async function () {
      const { badges, issuer } = await deployAttendanceBadges();
      const role = await badges.ISSUER_ROLE();

      await badges.grantIssuer(issuer.address);
      expect(await badges.hasRole(role, issuer.address)).to.equal(true);

      await badges.revokeIssuer(issuer.address);
      expect(await badges.hasRole(role, issuer.address)).to.equal(false);
    });

    it("rejects invalid role and read inputs", async function () {
      const { badges } = await deployAttendanceBadges();

      await expect(badges.grantIssuer(ethers.ZeroAddress)).to.be.revertedWith("POAP: issuer is zero address");
      await expect(badges.revokeIssuer(ethers.ZeroAddress)).to.be.revertedWith("POAP: issuer is zero address");
      await expect(badges.getPOAPEvent(404n)).to.be.revertedWith("POAP: token does not exist");
      await expect(badges.uri(404n)).to.be.revertedWith("POAP: token does not exist");
      await expect(badges.hasPOAP(ethers.ZeroAddress, 404n)).to.be.revertedWith("POAP: attendee is zero address");
      await expect(badges.getHolderTokenIds(ethers.ZeroAddress)).to.be.revertedWith("POAP: attendee is zero address");
      await expect(badges.getHolderPOAPBalances(ethers.ZeroAddress)).to.be.revertedWith(
        "POAP: attendee is zero address",
      );
    });

    it("emits status changes and rejects missing token status updates", async function () {
      const { badges } = await deployAttendanceBadges();
      const tokenId = await createDefaultEvent(badges);

      await expect(badges.setPOAPEventActive(tokenId, false)).to.emit(badges, "POAPEventStatusChanged").withArgs(tokenId, false);
      expect((await badges.getPOAPEvent(tokenId)).active).to.equal(false);

      await expect(badges.setPOAPEventActive(404n, true)).to.be.revertedWith("POAP: token does not exist");
    });
  });

  describe("analytics", function () {
    it("tracks total issued POAPs and unique holders globally", async function () {
      const { badges, attendee, secondAttendee } = await deployAttendanceBadges();
      const firstTokenId = await createDefaultEvent(badges);
      const secondTokenId = await badges.nextTokenId();
      await badges.createPOAPEvent("ipfs://another.json", 10, START_TIME, END_TIME);

      // Initial state
      expect(await badges.totalIssued()).to.equal(0n);
      expect(await badges.uniqueHoldersCount()).to.equal(0n);

      // Issue first POAP to first attendee
      await badges.issuePOAP(attendee.address, firstTokenId);
      expect(await badges.totalIssued()).to.equal(1n);
      expect(await badges.uniqueHoldersCount()).to.equal(1n);

      // Issue same POAP to second attendee
      await badges.issuePOAP(secondAttendee.address, firstTokenId);
      expect(await badges.totalIssued()).to.equal(2n);
      expect(await badges.uniqueHoldersCount()).to.equal(2n);

      // Issue different POAP to first attendee (already a holder)
      await badges.issuePOAP(attendee.address, secondTokenId);
      expect(await badges.totalIssued()).to.equal(3n);
      expect(await badges.uniqueHoldersCount()).to.equal(2n);
    });
  });
});
