const { ethers } = require("ethers");
const axios = require("axios");
require("dotenv").config();

const transferDint = async ({ amount, destAddr }) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_PROVIDER);
  const signer = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
  const contractAddr = process.env.DINT_TOKEN_ADDRESS;

  const abi = [
    {
      constant: false,
      inputs: [
        { name: "_to", type: "address" },
        { name: "_amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ name: "success", type: "bool" }],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const erc20dint = new ethers.Contract(contractAddr, abi, signer);

  // Get the current gas prices
  let gasPrice;
  let maxFeePerGas = ethers.BigNumber.from(40000000000); // fallback to 40 gwei
  let maxPriorityFeePerGas = ethers.BigNumber.from(40000000000); // fallback to 40 gwei
  try {
    const { data } = await axios({
      method: "get",
      url: "https://gasstation-mainnet.matic.network/v2",
    });

    console.log("Gas prices:", data);
    const gasPrices = data;
    if (gasPrices && gasPrices.hasOwnProperty("fast")) {
      maxFeePerGas = ethers.utils.parseUnits(gasPrices.fast.toString(), "gwei");
      maxPriorityFeePerGas = ethers.utils.parseUnits(
        (gasPrices.fast - 5).toString(),
        "gwei"
      );
      gasPrice = gasPrices.fast;
    } else {
      // handle the error or fallback to a default gas price
      gasPrice = 200;
      maxFeePerGas = ethers.BigNumber.from(90000000000); // fallback to 40 gwei
      maxPriorityFeePerGas = ethers.BigNumber.from(70000000000); // fallback to 40 gwei
    }
  } catch (error) {
    console.error("Error fetching gas prices:", error);
    gasPrice = 200;
    maxFeePerGas = ethers.utils.parseUnits("200", "gwei"); // Set default gas price
    maxPriorityFeePerGas = ethers.utils.parseUnits("200", "gwei"); // Set default priority gas price
  }

  // Estimate gas limit
  let gasLimit = await erc20dint.estimateGas.transfer(destAddr, amount);
  const GAS_MULTIPLIER = 2;
  gasLimit = parseInt(gasLimit * GAS_MULTIPLIER);

  // Send the transaction
  const tx = await erc20dint.transfer(destAddr, amount, {
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  console.log("Transaction Hash", tx.hash);
  return tx;
};

module.exports = { transferDint };
