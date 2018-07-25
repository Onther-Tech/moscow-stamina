const Promise = require("bluebird");

const {advanceToBlock, advanceBlock} = require("./helpers/advanceToBlock");
const {expectThrow} = require("./helpers/expectThrow");
const {inTransaction} = require("./helpers/expectEvent");
const Stamina = artifacts.require("Stamina");

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

Promise.promisifyAll(web3.eth);

contract("Stamina", async (accounts) => {
  let stamina;

  const [
    owner,
    depositor,
    delegater,
    delegatee,
  ] = accounts;

  const etherAmount = new BigNumber(1e18);
  const gasFee = new BigNumber(1e16);
  const minDeposit = new BigNumber(1e17);
  const recoveryEpochLength = 20;
  const withdrawalDelay = 50;

  before(async () => {
    await advanceManyBlocks(100);
    stamina = await Stamina.new();
    await stamina.init(minDeposit, recoveryEpochLength, withdrawalDelay);
  });

  describe("delegatee", () => {
    it("can set delegatee to anyone", async () => {
      await stamina.setDelegator(owner, { from: delegatee });
      (await stamina.getDelegatee(owner)).should.be.equal(delegatee);

      await stamina.setDelegator(delegater, { from: delegatee });
      (await stamina.getDelegatee(delegater)).should.be.equal(delegatee);
    });
  });

  describe("deposit", () => {
    it("cannot deposit less than MIN_DEPOSIT", async () => {
      await expectThrow(stamina.deposit(delegatee, { from: depositor, value: minDeposit.minus(1) }));

      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(0);
      (await stamina.getDeposit(depositor, delegatee)).should.be.bignumber.equal(0);
    });

    it("can deposit Ether equal or more than 0.1 ETH", async () => {
      await stamina.deposit(delegatee, { from: depositor, value: etherAmount });

      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(etherAmount);
      (await stamina.getDeposit(depositor, delegatee)).should.be.bignumber.equal(etherAmount);
    });
  });

  describe("stamina", () => {
    const subtractAmount = 100;
    const addAmount = 50;

    let totalDeposit;

    before(async () => {
      totalDeposit = await stamina.getTotalDeposit(delegatee);
    });

    it("should not be subtracted more than current stamina", async () => {
      await expectThrow(stamina.subtractStamina(delegatee, totalDeposit.plus(1)));
    });

    it("should be subtracted", async () => {
      await stamina.subtractStamina(delegatee, subtractAmount);

      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(totalDeposit.sub(subtractAmount));
    });

    it("should be added", async () => {
      await stamina.addStamina(delegatee, addAmount);

      (await stamina.getStamina(delegatee)).should.be.bignumber
        .equal(totalDeposit.sub(subtractAmount).add(addAmount));
    });

    it("should not be added more than total deposit", async () => {
      await stamina.addStamina(delegatee, addAmount * 2);

      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(totalDeposit);
    });

    it("should be recovered whole amount after RECOVER_EPOCH_LENGTH", async () => {
      await stamina.subtractStamina(delegatee, totalDeposit);

      await advanceManyBlocks(recoveryEpochLength)

      await stamina.addStamina(delegatee, 1);
      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(totalDeposit);
    })
  });

  describe("withdraw", () => {
    const numRequests = 4;
    const withdrawalAmount = etherAmount.div(numRequests);

    it("can request withdrawal", async () => {
      for (let i = 0; i < numRequests; i++) {
        await stamina.requestWithdrawal(delegatee, withdrawalAmount, { from: depositor });
      }

      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(0);
      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(0);

    });

    it("cannot withdraw in WITHDRAWAL_DELAY blocks", async () => {
      await expectThrow(stamina.withdraw({ from: depositor }));
    });

    it("can withdraw in WITHDRAWAL_DELAY blocks", async () => {
      for (let i = 0; i < withdrawalDelay + 4; i++) {
        await advanceBlock();
      }

      for (let i = 0; i < numRequests; i++) {
        const checker = await checkBalance(depositor);
        await stamina.withdraw({ from: depositor });
        await checker(withdrawalAmount, gasFee);
      }
    });
  });
});

// custom helpers
async function checkBalance(address) {
  const balance1 = await web3.eth.getBalance(address);

  return async function(increase, delta = 0) {
    const balance2 = await web3.eth.getBalance(address);

    const expected = new BigNumber(balance1).add(increase);
    const actual = new BigNumber(balance2);

    if (delta === 0) {
      assert(expected.equal(actual), `Expected ${expected.toExponential(8)} but got ${actual.toExponential(8)}`)
    } else {
      const actual1 = actual.sub(delta);
      const actual8 = actual.add(delta);

      assert(
        expected.gt(actual1) && expected.lt(actual8),
        `Expected ${expected.toExponential(8)} but not in range of (${actual1.toExponential(8)}, ${actual8.toExponential(8)})`
      );
    }
  }
}

async function advanceManyBlocks(numBlocks) {
  const currentBlock = await web3.eth.getBlockNumberAsync();
  return advanceToBlock(currentBlock + numBlocks);
}
