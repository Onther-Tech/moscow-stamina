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
    from,
    delegatee,
  ] = accounts;

  const etherAmount = 1e18;
  const gasFee = 1e16;

  before(async () => {
    stamina = await Stamina.new();
  });

  describe("delegatee", () => {
    it("can set delegatee to anyone", async () => {
      await stamina.setDelegatee(owner, { from });
      (await stamina.getDelegatee(from)).should.be.equal(owner);

      await stamina.setDelegatee(delegatee, { from });
      (await stamina.getDelegatee(from)).should.be.equal(delegatee);
    });
  });

  describe("deposit", () => {
    it("cannot deposit less than 0.1 ETH", async () => {
      await expectThrow(stamina.deposit(delegatee, { from, value: 0.999e17 }));

      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(0);
      (await stamina.getDeposit(from, delegatee)).should.be.bignumber.equal(0);

    });

    it("can deposit Ether equal or more than 0.1 ETH", async () => {
      await stamina.deposit(delegatee, { from, value: etherAmount });

      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(etherAmount);
      (await stamina.getDeposit(from, delegatee)).should.be.bignumber.equal(etherAmount);
    });
  });

  describe("withdraw", () => {
    after(async () => {
      // re-deposit
      await stamina.deposit(delegatee, { from, value: etherAmount });
    });

    it("can request withdrawal", async () => {
      await stamina.requestWithdrawal(delegatee, etherAmount, { from });
      (await stamina.getTotalDeposit(delegatee)).should.be.bignumber.equal(0);
      (await stamina.getDeposit(from, delegatee)).should.be.bignumber.equal(0);
    });

    it("can withdraw Ether", async () => {
      const checkF = await checkBalance(from);
      await stamina.withdrawPayments({ from });
      await checkF(etherAmount, gasFee);
    });
  });

  describe("balance", () => {
    let totalDeposit;

    before(async () => {
      // read
      totalDeposit = await stamina.getTotalDeposit(delegatee);
    });

    it("should be 0 at initial", async () => {
      (await stamina.getBalance(delegatee)).should.be.bignumber.equal(0);
    });

    it("should be equal to total deposit when it reset", async () => {
      await stamina.resetBalance(delegatee);

      (await stamina.getBalance(delegatee)).should.be.bignumber.equal(totalDeposit);
    });

    it("should be subtracted", async () => {
      await stamina.subtractBalance(delegatee, 1);

      (await stamina.getBalance(delegatee)).should.be.bignumber.equal(totalDeposit.sub(1));
    });

    it("should be added", async () => {
      await stamina.addBalance(delegatee, 1);

      (await stamina.getBalance(delegatee)).should.be.bignumber.equal(totalDeposit);
    });

    it("should not be added more than total deposit", async () => {
      await stamina.addBalance(delegatee, 1);

      (await stamina.getBalance(delegatee)).should.be.bignumber.equal(totalDeposit);
    });

    it("only owner can control balance", async () => {
      await expectThrow(stamina.resetBalance(delegatee, { from }));
      await expectThrow(stamina.addBalance(delegatee, 1, { from }));
      await expectThrow(stamina.subtractBalance(delegatee, 1, { from }));
    })
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
