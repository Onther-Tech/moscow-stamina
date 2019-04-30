# Stamina: Transaction Fee Delegation

Stamina is a smart contract that can be paid as a transaction fee. And `delegatee` can rent his stamina for `delegator`. If `delegatee` specifies `delegator`, transaction fee that `delegator` have to pay is paid by `deelgator`'s stamina.

Also stamina is generated with the same amount as deposited (P)ETH, and it is recovered in every `RECOVER_EPOCH_LENGTH` blocks.

[Tokamak Network](https://github.com/onther-tech/plasma-evm) implements this transactione execution model. and Stamina contract is deployed at "0xdead" in child chain.

### Methods

##### `setDelegator(delegator)`
A `delegatee` set `delegator` address.

##### `deposit(address addr) payable`
Deposit (P)ETH and generate stamina for the `addr`. The amount of stamina is same as the deposited amount of (P)ETH and recovered in every `RECOVER_EPOCH_LENGTH` blocks.

##### `requestWithdrawal(address addr, uint amount)`
Request an withdrawal for deposited (P)ETH.

##### `requestWithdrawal(address addr, uint amount)`
Withdraw deposited (P)ETH after `WITHDRAWAL_DELAY` blocks from which withdrawal request created.


##### `addStamina(address addr, uint amount)`
Add stamina for the `addr`. This can be only by null address (`0x00`).

##### `subtractStamina(address addr, uint amount)`
Subtract stamina for the `addr`. This can be only by null address (`0x00`).