# moscow-stamina


### Usage

```javascript
// JS & truffle style pseudo code

const Stamina = artifacts.require("Stamina");
const stamina = stamina.deployed();

const owner = "0x...";
const from = "0x...";
const delegatee = "0x...";

// 1. deposit Ether to Stamina contract (min deposit = 0.1 ETH)
stamina.deposit(delegatee, { from: from: value: 1e17 });

// 2. reset stamina
stamina.resetStamina(delegatee, { from: owner });

// 3. pay & refund gas fee with stamina
stamina.subtractStamina(delegatee, 0.5e17, { from: owner });
stamina.addStamina(delegatee, 0.1e17, { from: owner });

stamina.subtractStamina(delegatee, 0.5e17, { from: owner });
stamina.addStamina(delegatee, 0.1e17, { from: owner });

// 4. recover used stamina up to deposit
stamina.resetStamina(delegatee, { from: owner });

```
