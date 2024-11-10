Tool to send static amount ETC20(ETH) to the list of unique wallets

Configure:
- update variables `network` and `amount` in `transferSLN.ts`
- var `pageSize` its max number of transfers per TX
- `MAX_TX_NUMBER` mean to stop script after some TX number
- maybe add new network to `chainData`
- add sender wallet private key to `.env` as variable `PRIVATE_KEY=0x1234...`
- in case of ERC20 airdrop you have to approve spending for total amoount for contract `0xd152f549545093347a162dce210e7293f1452150`
- make sure contract `0xd152f549545093347a162dce210e7293f1452150` deployed to required network
- run script with command `npm run send`