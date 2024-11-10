import { Address, createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, base } from 'viem/chains';
import 'dotenv/config';
const fs = require('fs');
const path = require('path');

// setting
// const network = 8453;
const network = 11155111;
const amount = parseEther('5');

const walletsPath = 'data/wallets.txt';
const walletsSuccessPath = 'data/wallets_success.txt';
const hashesPath = 'data/hashes.txt';

const chainData = {
	8453: {
		disperse: '0xd152f549545093347a162dce210e7293f1452150',
		chain: base,
		sln: '0xef0b105b4f2ce61d2a7ae62d03b1f4cb6c4fbeec',
	    // "https://base-rpc.publicnode.com",
		// rpc: `https://base.gateway.tenderly.co"`,
		// rpc: `https://developer-access-mainnet.base.org/`,
		rpc: `https://mainnet.base.org/`,
	},
	11155111: {
		disperse: '0xD152f549545093347A162Dce210e7293f1452150',
		chain: sepolia,
		sln: '0x0404ab3994ED48C300cE219546f757AD34484Dc7',
		rpc: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
	},
};

const activeChainData = chainData[network];


const disperseAbi = [
	{
		constant: false,
		inputs: [
			{ name: 'token', type: 'address' },
			{ name: 'recipients', type: 'address[]' },
			{ name: 'values', type: 'uint256[]' },
		],
		name: 'disperseTokenSimple',
		outputs: [],
		payable: false,
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		constant: false,
		inputs: [
			{ name: 'token', type: 'address' },
			{ name: 'recipients', type: 'address[]' },
			{ name: 'values', type: 'uint256[]' },
		],
		name: 'disperseToken',
		outputs: [],
		payable: false,
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		constant: false,
		inputs: [
			{ name: 'recipients', type: 'address[]' },
			{ name: 'values', type: 'uint256[]' },
		],
		name: 'disperseEther',
		outputs: [],
		payable: true,
		stateMutability: 'payable',
		type: 'function',
	},
];

const wait = (ms: number) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

(async () => {
	const readFileLines = (filename: any) => {
		try {
			return fs.readFileSync(filename).toString('UTF8').split('\n');
		} catch (e){
			return []
		}
	}

	let hashes = readFileLines(hashesPath);
	let wallets = readFileLines(walletsPath);
	let sentArr = readFileLines(walletsSuccessPath);
	let sent: any = {};
	sentArr.map((s: string) => {
		sent[s.toLowerCase()] = true;
	});

	const account = privateKeyToAccount(process.env.PRIVATE_KEY as Address);

	console.log('Admin: ', account.address);

	const walletClient = createWalletClient({
		account,
		chain: activeChainData.chain,
		transport: http(activeChainData.rpc),
	});

	const publicClient = createPublicClient({
		chain: activeChainData.chain,
		transport: http(activeChainData.rpc),
	});

	let recepients = [];
	let recepientValues = [];
	let i, ownTxPendingNumber, pendingBlock;
	let counter = 0;
	//==========
	let pageSize = 200;
	const MAX_TX_NUMBER = 50;
	//==========
	do {
		counter++;
		recepients = [];
		recepientValues = [];
		for (i = 0; recepients.length < pageSize && i < wallets.length; i++) {
			let user = wallets[i].toLowerCase();
			if (!sent[user]) {
				recepients.push(user);
				recepientValues.push(amount);
			}
		}

		try {
			pendingBlock = await publicClient.getBlock({
				blockTag: 'pending',
				includeTransactions: true,
			});
			ownTxPendingNumber = pendingBlock.transactions.filter((tx) => tx.from == account.address).length;

			if (ownTxPendingNumber > 0) {
				await wait(5_000);
				throw Error('try again');
			}

			console.log('send TX... pending number...', ownTxPendingNumber);
			console.log('Sending... ', recepients.length);
			// return;
			const hash = await walletClient.writeContract({
				abi: disperseAbi,
				functionName: 'disperseToken',
				address: activeChainData.disperse as Address,
				args: [activeChainData.sln as Address, recepients, recepientValues],
			});
			hashes.push(hash);
			console.log('sent. hash...', hash);

			// 7. Wait for the transaction receipt

			await publicClient.waitForTransactionReceipt({
				hash,
				confirmations: 3,
				// pollingInterval: 5_000,
				// retryDelay: 5_000,
			});

			recepients.map((r: string) => {
				sent[r] = true;
			});

			const dir = path.dirname(walletsSuccessPath);
			fs.mkdirSync(dir, { recursive: true });
			
			fs.writeFileSync(walletsSuccessPath, Object.keys(sent).join('\n'));
			fs.writeFileSync(hashesPath, hashes.join('\n'));
			console.log('receipt received, write to files done.');
		} catch (e) {
			console.log(e);
		}
	} while (i < wallets.length && counter < MAX_TX_NUMBER);
	// } while (Object.keys(sent).length < wallets.length);
	console.log('done. all OK');
})();
