// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Penny: P2P payments, claimable pay links and bill splits settled in native USDC on Arc.
contract Penny {
    struct Link {
        address sender;
        uint128 amount;
        uint64 expiresAt;
        bool open;
    }

    struct Split {
        address creator;
        uint128 total;
        uint128 collected;
        uint32 debtors;
        uint32 paid;
    }

    mapping(address => Link) public links;
    mapping(uint256 => Split) public splits;
    mapping(uint256 => mapping(address => uint256)) public owed;
    uint256 public splitCount;

    event Payment(address indexed from, address indexed to, uint256 amount, string memo);
    event LinkCreated(address indexed claimKey, address indexed sender, uint256 amount, uint64 expiresAt, string memo);
    event LinkClaimed(address indexed claimKey, address indexed to, uint256 amount);
    event LinkCancelled(address indexed claimKey, address indexed sender, uint256 amount);
    event SplitCreated(uint256 indexed id, address indexed creator, uint256 total, string memo);
    event SplitPaid(uint256 indexed id, address indexed debtor, uint256 amount);

    error ZeroAmount();
    error InvalidLink();
    error LinkExpired();
    error BadSignature();
    error NotAllowed();
    error BadSplit();
    error WrongAmount();
    error TransferFailed();

    function pay(address to, string calldata memo) external payable {
        if (msg.value == 0) revert ZeroAmount();
        _send(to, msg.value);
        emit Payment(msg.sender, to, msg.value, memo);
    }

    function createLink(address claimKey, uint64 expiresAt, string calldata memo) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (claimKey == address(0) || links[claimKey].sender != address(0) || expiresAt <= block.timestamp) {
            revert InvalidLink();
        }
        links[claimKey] = Link(msg.sender, uint128(msg.value), expiresAt, true);
        emit LinkCreated(claimKey, msg.sender, msg.value, expiresAt, memo);
    }

    /// @notice Anyone may relay a claim; the claim key's signature pins the recipient so it cannot be front-run.
    function claimLink(address claimKey, address to, bytes calldata signature) external {
        Link storage link = links[claimKey];
        if (!link.open) revert InvalidLink();
        if (block.timestamp > link.expiresAt) revert LinkExpired();
        if (_recover(claimDigest(claimKey, to), signature) != claimKey) revert BadSignature();

        link.open = false;
        _send(to, link.amount);
        emit LinkClaimed(claimKey, to, link.amount);
    }

    /// @notice The sender can cancel any time; after expiry anyone can trigger the refund back to the sender.
    function cancelLink(address claimKey) external {
        Link storage link = links[claimKey];
        if (!link.open) revert InvalidLink();
        if (msg.sender != link.sender && block.timestamp <= link.expiresAt) revert NotAllowed();

        link.open = false;
        _send(link.sender, link.amount);
        emit LinkCancelled(claimKey, link.sender, link.amount);
    }

    function createSplit(address[] calldata debtors, uint256[] calldata amounts, string calldata memo)
        external
        returns (uint256 id)
    {
        if (debtors.length == 0 || debtors.length != amounts.length) revert BadSplit();
        id = ++splitCount;

        uint256 total;
        for (uint256 i; i < debtors.length; ++i) {
            if (amounts[i] == 0 || debtors[i] == msg.sender || owed[id][debtors[i]] != 0) revert BadSplit();
            owed[id][debtors[i]] = amounts[i];
            total += amounts[i];
        }

        splits[id] = Split(msg.sender, uint128(total), 0, uint32(debtors.length), 0);
        emit SplitCreated(id, msg.sender, total, memo);
    }

    function paySplit(uint256 id) external payable {
        uint256 amount = owed[id][msg.sender];
        if (amount == 0) revert NotAllowed();
        if (msg.value != amount) revert WrongAmount();

        owed[id][msg.sender] = 0;
        Split storage split = splits[id];
        split.collected += uint128(amount);
        split.paid += 1;
        _send(split.creator, amount);
        emit SplitPaid(id, msg.sender, amount);
    }

    function claimDigest(address claimKey, address to) public view returns (bytes32) {
        bytes32 inner = keccak256(abi.encode(block.chainid, address(this), claimKey, to));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }
}
