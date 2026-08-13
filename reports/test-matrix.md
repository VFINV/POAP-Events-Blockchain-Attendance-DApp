# AttendanceBadges Test Matrix

Coverage command: `npm run test:coverage`  
Result: 100% line coverage, 100% statement coverage for `contracts/AttendanceBadges.sol`.

Gas command: `npm run test:gas`  
Raw gas JSON: `reports/gas-stats.json`  
Raw outputs: `reports/test-output.txt`, `reports/coverage-output.txt`, `reports/gas-output.txt`

| Function / Area | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| constructor | valid owner + default URI | owner/admin/issuer initialized | owner, roles, ERC-1155 interface, next ID verified | Pass |
| constructor | zero owner | revert with `OwnableInvalidOwner` | reverted | Pass |
| constructor | empty default URI | revert `POAP: default URI is empty` | reverted | Pass |
| createPOAPEvent | valid URI, supply, time window | creates token ID and emits `POAPEventCreated` | event emitted; metadata and token IDs readable | Pass |
| createPOAPEvent | empty URI | revert `POAP: token URI is empty` | reverted | Pass |
| createPOAPEvent | zero max supply | revert `POAP: max supply is zero` | reverted | Pass |
| createPOAPEvent | invalid time window | revert `POAP: invalid event window` | reverted | Pass |
| createPOAPEvent | non-owner caller | revert `OwnableUnauthorizedAccount` | reverted | Pass |
| setPOAPEventActive | owner toggles valid token | emits status event and updates active flag | event emitted; flag updated | Pass |
| setPOAPEventActive | non-owner caller | revert `OwnableUnauthorizedAccount` | reverted | Pass |
| setPOAPEventActive | missing token | revert `POAP: token does not exist` | reverted | Pass |
| issuePOAP | owner issues to attendee | emits `POAPIssued`, balance becomes 1 | event emitted; balance/read helpers verified | Pass |
| issuePOAP | granted issuer issues | allowed and emits issuer address | event emitted; balance updated | Pass |
| issuePOAP | unauthorized caller | revert `POAP: caller is not issuer` | reverted | Pass |
| issuePOAP | zero attendee | revert `POAP: attendee is zero address` | reverted | Pass |
| issuePOAP | missing token ID | revert `POAP: token does not exist` | reverted | Pass |
| issuePOAP | duplicate attendee/token | revert `POAP: attendee already issued` | reverted | Pass |
| issuePOAP | inactive event | revert `POAP: event inactive` | reverted | Pass |
| issuePOAP | max supply exceeded | revert `POAP: max supply reached` | reverted | Pass |
| batchIssuePOAPs | three valid attendees | all balances become 1; minted count 3 | `balanceOfBatch` and minted count verified | Pass |
| batchIssuePOAPs | empty attendee array | revert `POAP: no attendees` | reverted | Pass |
| batchIssuePOAPs | zero attendee | revert `POAP: attendee is zero address` | reverted | Pass |
| batchIssuePOAPs | batch above supply | revert `POAP: max supply reached` | reverted | Pass |
| grantIssuer | valid issuer | role granted | `hasRole` true | Pass |
| grantIssuer | zero address | revert `POAP: issuer is zero address` | reverted | Pass |
| revokeIssuer | valid issuer | role revoked | `hasRole` false | Pass |
| revokeIssuer | zero address | revert `POAP: issuer is zero address` | reverted | Pass |
| getPOAPEvent | missing token | revert `POAP: token does not exist` | reverted | Pass |
| uri | missing token | revert `POAP: token does not exist` | reverted | Pass |
| hasPOAP | zero attendee | revert `POAP: attendee is zero address` | reverted | Pass |
| getHolderTokenIds | zero attendee | revert `POAP: attendee is zero address` | reverted | Pass |
| getHolderPOAPBalances | zero attendee | revert `POAP: attendee is zero address` | reverted | Pass |

## Deliberate Failure Explanations

- Access-control failures prove only the owner can create/update badge types and only owner/issuer accounts can mint.
- Input-validation failures prove zero addresses, empty metadata, invalid time windows, missing token IDs, duplicate issuance, and max-supply overflow are rejected.
- Inactive-event and duplicate-issuance failures prove badge issuance state is enforced before mint interactions.

## Gas Summary

| Function | Average Gas |
|---|---:|
| Deployment | 2,563,405 |
| createPOAPEvent | 170,000 |
| issuePOAP | 179,584 |
| batchIssuePOAPs | 381,015 |
| grantIssuer | 48,691 |
| revokeIssuer | 26,651 |
| setPOAPEventActive | 27,803 |
| getPOAPEvent | 28,576 |
| getHolderPOAPBalances | 29,831 |
| balanceOfBatch | 33,096 |
