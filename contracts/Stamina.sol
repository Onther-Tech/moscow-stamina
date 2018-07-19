pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/NoOwner.sol";
import "openzeppelin-solidity/contracts/payment/PullPayment.sol";

contract Stamina is NoOwner, PullPayment {
  using SafeMath for *;

  /**
   * Internal States
   */
  // delegatee of `from` account
  // `from` => `delegatee`
  mapping (address => address) _delegatee;

  // Stamina balance of delegatee
  // `delegatee` => `balance`
  mapping (address => uint256) _balance;

  // total deposit of delegatee
  // `delegatee` => `total deposit`
  mapping (address => uint256) _total_deposit;

  // deposit of delegatee
  // `depositor` => `delegatee` => `deposit`
  mapping (address => mapping (address => uint256)) _deposit;

  /**
   * Public States
   */
  uint256 public constant minDeposit = 0.1 ether;

  /**
   * Modifiers
   */
  modifier onlyChainOrOwner() {
    require(msg.sender == owner || msg.sender == address(0));
    _;
  }

  /**
   * Events
   */
  event Deposit(address indexed _depositor, address indexed delegatee, uint256 _amount);
  event WithdrawalRequested(address indexed _depositor, address indexed delegatee, uint256 _amount);
  event DelegateeChanged(address _from, address _oldDelegatee, address _newDelegatee);

  /**
   * Getters
   */
  function getDelegatee(address _from) public view returns (address) {
    return _delegatee[_from];
  }

  function getBalance(address _addr) public view returns (uint) {
    return _balance[_addr];
  }

  function getTotalDeposit(address _delegatee) public view returns (uint) {
    return _total_deposit[_delegatee];
  }

  function getDeposit(address _depositor, address _delegatee) public view returns (uint) {
    return _deposit[_depositor][_delegatee];
  }

  /**
   * Setters and External functions
   */
  /// @notice change current delegatee
  function setDelegatee(address _newDelegatee) external returns (bool) {
    address oldDelegatee = _delegatee[msg.sender];

    _delegatee[msg.sender] = _newDelegatee;
    
    emit DelegateeChanged(msg.sender, oldDelegatee, _newDelegatee);
    return true;
  }

  /// @notice deposit Ether to delegatee
  function deposit(address _delegatee) external payable returns (bool) {
    require(msg.value >= minDeposit);

    _total_deposit[_delegatee] = _total_deposit[_delegatee].add(msg.value);
    _deposit[msg.sender][_delegatee] = _deposit[msg.sender][_delegatee].add(msg.value);

    emit Deposit(msg.sender, _delegatee, msg.value);
    return true;
  }

  /// @notice request to withdraw Ether from delegatee. it store Ether to Escrow contract.
  ///         later `withdrawPayments` transfers Ether from Escrow to the depositor
  function requestWithdrawal(address _delegatee, uint _amount) external returns (bool) {
    uint fDeposit = _deposit[msg.sender][_delegatee];

    _total_deposit[_delegatee] = _total_deposit[_delegatee].sub(_amount);
    _deposit[msg.sender][_delegatee] = fDeposit.sub(_amount);
    asyncTransfer(msg.sender, _amount);

    emit WithdrawalRequested(msg.sender, _delegatee, _amount);
    return true;
  }

  /// @notice reset stamina up to total deposit of delegatee
  function resetStamina(address _delegatee) external onlyChainOrOwner {
    _balance[_delegatee] = _total_deposit[_delegatee];
  }

  /// @notice add stamina of delegatee. The upper bound of stamina is total deposit of delegatee.
  function addStamina(address _delegatee, uint _amount) external onlyChainOrOwner returns (bool) {
    uint dTotalDeposit = _total_deposit[_delegatee];
    uint targetBalance = _balance[_delegatee].add(_amount);

    if (targetBalance > dTotalDeposit) _balance[_delegatee] = dTotalDeposit;
    else _balance[_delegatee] = targetBalance;

    return true;
  }

  /// @notice subtracte stamina of delegatee.
  function subtractStamina(address _delegatee, uint _amount) external onlyChainOrOwner returns (bool) {
    uint dBalance = _balance[_delegatee];

    _balance[_delegatee] = dBalance.sub(_amount);
    return true;
  }


}
