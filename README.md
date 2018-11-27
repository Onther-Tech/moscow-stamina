# moscow-stamina


### Usage

```javascript
// JS & truffle style pseudo code

const Stamina = artifacts.require("Stamina");
const stamina = Stamina.deployed();
// or stamina = Stamina.at("0x000000000000000000000000000000000000dead")

const minDeposit = 1e17;
const recoveryEpochLength = 20;
const withdrawalDelay = 50;

const owner = "0x...";
const delegator = "0x...";
const delegatee = "0x...";

// 1. initialize stamina contract
stamina.init(minDeposit, recoveryEpochLength, withdrawalDelay);

// 2. set `delegatee` as a delegatee of `delegator`
stamina.setDelegator(delegator, { from: delegatee });

// 3. deposit Ether to Stamina contract (min deposit = 0.1 ETH)
stamina.deposit(delegatee, { from: delegatee, value: minDeposit });

// 4. pay & refund gas fee with stamina (this step is only possible by moscow chain)
// After recoveryEpochLength blocks, stamina will be recovered
stamina.subtractStamina(delegatee, 0.5e17, { from: owner });
stamina.addStamina(delegatee, 0.1e17, { from: owner });

stamina.subtractStamina(delegatee, 0.5e17, { from: owner });
stamina.addStamina(delegatee, 0.1e17, { from: owner });

// 5. reqeust withdrawal
stamina.requestWithdrawal(delegatee, 1e17, { from: owner });

// 6. withdraw deposit after withdrawalDelay blocks
stamina.withdraw({ from: owner });

```
