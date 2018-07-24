const {advanceToBlock, advanceBlock} = require("./helpers/advanceToBlock");
const {expectThrow} = require("./helpers/expectThrow");
const Stamina = artifacts.require("Stamina");

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();


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
    stamina = await Stamina.new();
    await stamina.init(minDeposit, recoveryEpochLength, withdrawalDelay);
  });

  describe("delegatee", () => {
    it("can set delegatee to anyone", async () => {
      await stamina.setDelegatee(owner, { from: delegatee });
      (await stamina.getDelegatee(owner)).should.be.equal(delegatee);

      await stamina.setDelegatee(delegater, { from: delegatee });
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
    let totalDeposit;

    before(async () => {
      // read
      totalDeposit = await stamina.getTotalDeposit(delegatee);
    });

    it("should not be subtracted more than current stamina", async () => {
      await expectThrow(stamina.subtractStamina(delegatee, totalDeposit.plus(1)));
    });

    it("should be subtracted", async () => {
      await stamina.subtractStamina(delegatee, 1);

      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(totalDeposit.sub(1));
    });

    it("should be added", async () => {
      await stamina.addStamina(delegatee, 1);

      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(totalDeposit);
    });

    it("should not be added more than total deposit", async () => {
      await stamina.addStamina(delegatee, 1);

      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(totalDeposit);
    });
  });

  describe("withdraw", () => {
    it("can request withdrawal", async () => {
      await stamina.requestWithdrawal(delegatee, etherAmount, { from: depositor });

      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(0);
      (await stamina.getStamina(delegatee)).should.be.bignumber.equal(0);

    });

    it("cannot withdraw in WITHDRAWAL_DELAY blocks", async () => {
      await expectThrow(stamina.withdraw({ from: depositor }));
    });

    it("can withdraw in WITHDRAWAL_DELAY blocks", async () => {
      for (let i = 0; i < withdrawalDelay + 1; i++) {
        await advanceBlock();
      }

      const checkF = await checkBalance(depositor);

      await stamina.withdraw({ from: depositor });

      await checkF(etherAmount, gasFee);
    });
  });
});

// custom helpers
async function checkBalance(address) {
  const balance1 = await web3.eth.getBalance(address);

  return async function(increase, delta = 0) {
    const balance8 = await web3.eth.getBalance(address);

    const expected = new BigNumber(balance1).add(increase);
    const actual = new BigNumber(balance8);

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
