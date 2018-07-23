pragma solidity ^0.4.24;

contract Stamina {
  // Exit handles withdrawal request
  struct Exit {
    uint128 amount;
    uint128 requestBlockNumber;

    address depositor;

    bool processed;
  }

  /**
   * Internal States
   */
  // delegatee of `from` account
  // `from` => `delegatee`
  mapping (address => address) _delegatee;

  // Stamina balance of delegatee
  // `delegatee` => `balance`
  mapping (address => uint) _stamina;

  // total deposit of delegatee
  // `delegatee` => `total deposit`
  mapping (address => uint) _total_deposit;

  // deposit of delegatee
  // `depositor` => `delegatee` => `deposit`
  mapping (address => mapping (address => uint)) _deposit;

  // last recovery block of delegatee
  mapping (address => uint256) _last_recovery_block;

  // depositor => [index] => Exit
  mapping (address => Exit[]) _exits;
  mapping (address => uint256) _num_exits;
  mapping (address => uint256) _last_processed_exit;

  /**
   * Public States
   */
  bool public initialized;

  uint public MIN_DEPOSIT;
  uint public RECOVER_EPOCH_LENGTH; // stamina is recovered when block number % RECOVER_DELAY == 0
  uint public EXIT_DELAY;           // Refund will be made EXIT_DELAY blocks after exitor request exit.
                                    // RECOVER_EPOCH_LENGTH * 2 < EXIT_DELAY


  bool public produciton = true; // if the contract is inserted into
                                 // genesis block, it will be false

  /**
   * Modifiers
   */
  modifier onlyChain() {
    require(!produciton || msg.sender == address(0));
    _;
  }

  /**
   * Events
   */
  event Deposited(address indexed depositor, address indexed delegatee, uint amount);
  event Withdrawn(address indexed depositor, address indexed delegatee, uint amount);
  event DelegateeChanged(address delegater, address oldDelegatee, address newDelegatee);

  /**
   * Init
   */
  function init(uint minDeposit, uint recoveryEpochLength, uint exitDelay) external {
    require(!initialized);

    require(minDeposit > 0);
    require(recoveryEpochLength > 0);
    require(exitDelay > 0);

    require(recoveryEpochLength * 2 < exitDelay);

    MIN_DEPOSIT = minDeposit;
    RECOVER_EPOCH_LENGTH = recoveryEpochLength;
    EXIT_DELAY = exitDelay;

    initialized = true;
  }

  /**
   * Getters
   */
  function getDelegatee(address delegater) public view returns (address) {
    return _delegatee[delegater];
  }

  function getStamina(address addr) public view returns (uint) {
    return _stamina[addr];
  }

  function getTotalDeposit(address delegatee) public view returns (uint) {
    return _total_deposit[delegatee];
  }

  function getDeposit(address depositor, address delegatee) public view returns (uint) {
    return _deposit[depositor][delegatee];
  }

  function getNumExits(address depositor) public view returns (uint) {
    return _num_exits[depositor];
  }

  /**
   * Setters and External functions
   */
  /// @notice set `msg.sender` as delegatee of `delegater`
  function setDelegatee(address delegater) external returns (bool) {
    address oldDelegatee = _delegatee[delegater];

    _delegatee[delegater] = msg.sender;

    emit DelegateeChanged(delegater, oldDelegatee, msg.sender);
    return true;
  }

  /// @notice deposit Ether to delegatee
  function deposit(address delegatee) external payable returns (bool) {
    require(msg.value >= MIN_DEPOSIT);

    uint dTotalDeposit = _total_deposit[delegatee];
    uint fDeposit = _deposit[msg.sender][delegatee];

    require(dTotalDeposit + msg.value > dTotalDeposit);
    require(fDeposit + msg.value > fDeposit);

    _total_deposit[delegatee] = dTotalDeposit + msg.value;
    _deposit[msg.sender][delegatee] = fDeposit + msg.value;
    _stamina[delegatee] += msg.value;

    emit Deposited(msg.sender, delegatee, msg.value);
    return true;
  }

  /// @notice request to withdraw Ether from delegatee. it store Ether to Escrow contract.
  ///         later `withdrawPayments` transfers Ether from Escrow to the depositor
  function withdraw(address delegatee, uint amount) external returns (bool) {
    uint dTotalDeposit = _total_deposit[delegatee];
    uint fDeposit = _deposit[msg.sender][delegatee];

    require(dTotalDeposit - amount < dTotalDeposit);
    require(fDeposit - amount < fDeposit);

    _total_deposit[delegatee] = dTotalDeposit - amount;
    _deposit[msg.sender][delegatee] = fDeposit - amount;

    msg.sender.transfer(amount);

    emit Withdrawn(msg.sender, delegatee, amount);
    return true;
  }

  /// @notice reset stamina up to total deposit of delegatee
  function resetStamina(address delegatee) external onlyChain {
    _stamina[delegatee] = _total_deposit[delegatee];
  }

  /// @notice add stamina of delegatee. The upper bound of stamina is total deposit of delegatee.
  function addStamina(address delegatee, uint amount) external onlyChain returns (bool) {
    uint dTotalDeposit = _total_deposit[delegatee];
    uint dBalance = _stamina[delegatee];

    require(dBalance + amount > dBalance);
    uint targetBalance = dBalance + amount;

    if (targetBalance > dTotalDeposit) _stamina[delegatee] = dTotalDeposit;
    else _stamina[delegatee] = targetBalance;

    return true;
  }

  /// @notice subtracte stamina of delegatee.
  function subtractStamina(address delegatee, uint amount) external onlyChain returns (bool) {
    uint dBalance = _stamina[delegatee];

    require(dBalance - amount < dBalance);
    _stamina[delegatee] = dBalance - amount;
    return true;
  }
}
