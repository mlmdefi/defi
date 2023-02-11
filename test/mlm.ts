/** @format */
import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { BigNumber, Contract, utils } from "ethers";

function eth(n: number, decimals: number = 18) {
    return utils.parseUnits(n.toString(), decimals);
}
describe("mlm", function () {
    let busd: Contract;
    let usdt: Contract;
    let mlm: Contract;
    let nft: Contract;
    let _owner: any;
    let _fee: any;
    let _addr1: any;
    let _addr2: any;
    let ownerSigner: any;
    let addr1Signer: any;
    let feeSigner: any;
    let addr2Signer: any;
    let address: any;
    let addressSigner: any;
    let joinAmount = [0, 9.9, 49.9, 99.9, 149.9, 199.9];
    beforeEach(async () => {
        const BUSD = await ethers.getContractFactory("tUSDT");
        busd = await BUSD.deploy();
        const USDT = await ethers.getContractFactory("tUSDT");
        usdt = await USDT.deploy();
        const MLM = await ethers.getContractFactory("mlm");
        mlm = await MLM.deploy();
        const {
            owner,
            fee,
            addr1,
            addr2,
            addr3,
            addr4,
            addr5,
            addr6,
            addr7,
            addr8,
            addr9,
            addr10,
        } = await getNamedAccounts();
        _owner = owner;
        _fee = fee;
        _addr1 = addr1;
        _addr2 = addr2;
        ownerSigner = await ethers.getSigner(owner);
        addr1Signer = await ethers.getSigner(addr1);
        feeSigner = await ethers.getSigner(fee);
        addr2Signer = await ethers.getSigner(addr2);
        await mlm.initialize(fee, owner, busd.address, usdt.address);

        await busd.mint(addr1, eth(100000));
        await busd.mint(addr2, eth(100000));
        await busd.mint(addr3, eth(100000));
        await busd.mint(addr4, eth(100000));
        await busd.mint(addr5, eth(100000));
        await busd.mint(addr6, eth(100000));
        await busd.mint(addr7, eth(100000));
        await busd.mint(addr8, eth(100000));
        await busd.mint(addr9, eth(100000));
        await busd.mint(addr10, eth(100000));
        await busd
            .connect(addr1Signer)
            .approve(mlm.address, ethers.constants.MaxUint256);

        await mlm.connect(ownerSigner).initPartner();

        address = [
            addr1,
            addr2,
            addr3,
            addr4,
            addr5,
            addr6,
            addr7,
            addr8,
            addr9,
            addr10,
        ];
    });
    it("batch join level free", async function () {
        let upline = _owner;
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, 0, `aa${layer}`);
            upline = address[layer];
        }
        // check expire time
        const userData = await mlm.userData(address[8]);
        expect(userData.expireTime).to.gt(
            parseInt((new Date().getTime() / 1000).toString()) +
                29 * 24 * 60 * 60
        );
        for (let layer = 8; layer >= 0; layer--) {
            const userData = await mlm.userData(address[layer]);
            const parent = layer > 0 ? address[layer - 1] : _owner;
            expect(userData.grade).to.equal(0);
            expect(userData.upline).to.equal(parent);
            expect(userData.domain).to.equal(`aa${layer}`);
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            expect(parentBUSD).to.equal(0);
        }
    });
    it("batch join level 1", async function () {
        const level = 1;
        let upline = _owner;
        let totalPay = BigNumber.from(0);
        let totalIncome = BigNumber.from(0);
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            const oldBal = await busd.balanceOf(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, level, `aa${layer}`);
            const newBal = await busd.balanceOf(address[layer]);

            const comsume = oldBal.sub(newBal);
            expect(comsume).to.equal(eth(joinAmount[level]));
            totalPay = totalPay.add(comsume);
            upline = address[layer];
        }
        // check expire time
        const userData = await mlm.userData(address[8]);
        expect(userData.expireTime).to.gt(
            parseInt((new Date().getTime() / 1000).toString()) +
                364 * 24 * 60 * 60
        );
        for (let layer = 8; layer >= 0; layer--) {
            const userData = await mlm.userData(address[layer]);
            const parent = layer > 0 ? address[layer - 1] : _owner;
            expect(userData.grade).to.equal(layer == 0 ? level + 1 : level);
            expect(userData.upline).to.equal(parent);
            expect(userData.domain).to.equal(`aa${layer}`);
        }
        // check commission
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            let income = BigNumber.from(0);
            for (let i = layer; i <= 8; i++) {
                const calcCommission = await mlm.calculatorMyCommission(
                    parent,
                    address[i],
                    eth(joinAmount[level])
                );
                income = income.add(calcCommission);
            }
            totalIncome = totalIncome.add(income);
            expect(parentBUSD).to.equal(income);
        }
        const reward = await mlm.reward(busd.address);
        expect(totalPay).to.equal(totalIncome.add(reward));
    });
    it("batch join level 2", async function () {
        const level = 2;
        let upline = _owner;
        let totalPay = BigNumber.from(0);
        let totalIncome = BigNumber.from(0);
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            const oldBal = await busd.balanceOf(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, level, `aaaaaaaaaaaa${layer}`);
            const newBal = await busd.balanceOf(address[layer]);

            const comsume = oldBal.sub(newBal);
            expect(comsume).to.equal(eth(joinAmount[level]));
            totalPay = totalPay.add(comsume);
            upline = address[layer];
        }
        for (let layer = 8; layer >= 0; layer--) {
            const userData = await mlm.userData(address[layer]);
            const parent = layer > 0 ? address[layer - 1] : _owner;
            expect(userData.grade).to.equal(level + 1);
            expect(userData.upline).to.equal(parent);
            expect(userData.domain).to.equal(`aaaaaaaaaaaa${layer}`);
        }
        // check commission
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            let income = BigNumber.from(0);
            for (let i = layer; i <= 8; i++) {
                const calcCommission = await mlm.calculatorMyCommission(
                    parent,
                    address[i],
                    eth(joinAmount[level])
                );
                income = income.add(calcCommission);
            }
            totalIncome = totalIncome.add(income);
            expect(parentBUSD).to.equal(income);
        }
        const reward = await mlm.reward(busd.address);
        expect(totalPay).to.equal(totalIncome.add(reward));
    });
    it("batch join level 3", async function () {
        const level = 3;
        let upline = _owner;
        let totalPay = BigNumber.from(0);
        let totalIncome = BigNumber.from(0);
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            const oldBal = await busd.balanceOf(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, level, `aaaaaaaaaaaa${layer}`);
            const newBal = await busd.balanceOf(address[layer]);

            const comsume = oldBal.sub(newBal);
            expect(comsume).to.equal(eth(joinAmount[level]));
            totalPay = totalPay.add(comsume);
            upline = address[layer];
        }
        for (let layer = 8; layer >= 0; layer--) {
            const userData = await mlm.userData(address[layer]);
            const parent = layer > 0 ? address[layer - 1] : _owner;
            expect(userData.grade).to.equal(level);
            expect(userData.upline).to.equal(parent);
            expect(userData.domain).to.equal(`aaaaaaaaaaaa${layer}`);
        }
        // check commission
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            let income = BigNumber.from(0);
            for (let i = layer; i <= 8; i++) {
                const calcCommission = await mlm.calculatorMyCommission(
                    parent,
                    address[i],
                    eth(joinAmount[level])
                );
                income = income.add(calcCommission);
            }
            totalIncome = totalIncome.add(income);
            expect(parentBUSD).to.equal(income);
        }
        const reward = await mlm.reward(busd.address);
        expect(totalPay).to.equal(totalIncome.add(reward));
    });
    it("batch join level 4", async function () {
        const level = 4;
        let upline = _owner;
        let totalPay = BigNumber.from(0);
        let totalIncome = BigNumber.from(0);
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            const oldBal = await busd.balanceOf(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, level, `aaaaaaaaaaaa${layer}`);
            const newBal = await busd.balanceOf(address[layer]);

            const comsume = oldBal.sub(newBal);
            expect(comsume).to.equal(eth(joinAmount[level]));
            totalPay = totalPay.add(comsume);
            upline = address[layer];
        }
        for (let layer = 8; layer >= 0; layer--) {
            const userData = await mlm.userData(address[layer]);
            const parent = layer > 0 ? address[layer - 1] : _owner;
            expect(userData.grade).to.equal(level);
            expect(userData.upline).to.equal(parent);
            expect(userData.domain).to.equal(`aaaaaaaaaaaa${layer}`);
        }
        // check commission
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            let income = BigNumber.from(0);
            for (let i = layer; i <= 8; i++) {
                const calcCommission = await mlm.calculatorMyCommission(
                    parent,
                    address[i],
                    eth(joinAmount[level])
                );
                income = income.add(calcCommission);
            }
            totalIncome = totalIncome.add(income);
            expect(parentBUSD).to.equal(income);
        }
        const reward = await mlm.reward(busd.address);
        expect(totalPay).to.equal(totalIncome.add(reward));
    });
    it("batch join level 5", async function () {
        const level = 5;
        let upline = _owner;
        let totalPay = BigNumber.from(0);
        let totalIncome = BigNumber.from(0);
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            const oldBal = await busd.balanceOf(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, level, `aaaaaaaaaaaa${layer}`);
            const newBal = await busd.balanceOf(address[layer]);

            const comsume = oldBal.sub(newBal);
            expect(comsume).to.equal(eth(joinAmount[level]));
            totalPay = totalPay.add(comsume);
            upline = address[layer];
        }
        for (let layer = 8; layer >= 0; layer--) {
            const userData = await mlm.userData(address[layer]);
            const parent = layer > 0 ? address[layer - 1] : _owner;
            expect(userData.grade).to.equal(level);
            expect(userData.upline).to.equal(parent);
            expect(userData.domain).to.equal(`aaaaaaaaaaaa${layer}`);
        }
        // check commission
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            let income = BigNumber.from(0);
            for (let i = layer; i <= 8; i++) {
                const calcCommission = await mlm.calculatorMyCommission(
                    parent,
                    address[i],
                    eth(joinAmount[level])
                );
                income = income.add(calcCommission);
            }
            totalIncome = totalIncome.add(income);
            expect(parentBUSD).to.equal(income);
        }
        const reward = await mlm.reward(busd.address);
        expect(totalPay).to.equal(totalIncome.add(reward));
    });
    it("upgrade leve free", async function () {
        const level = 1;
        let upline = _owner;
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, 0, `aa${layer}`);
            upline = address[layer];
        }
        const addrSigner = await ethers.getSigner(address[8]);

        await busd
            .connect(addrSigner)
            .approve(mlm.address, ethers.constants.MaxUint256);
        await mlm.connect(addrSigner).upgrade(level, busd.address);
        const userData = await mlm.userData(address[8]);
        expect(userData.grade).to.equal(level);
        let totalIncome = BigNumber.from(0);
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            const income = await mlm.calculatorMyCommission(
                parent,
                address[8],
                eth(joinAmount[level])
            );
            totalIncome = totalIncome.add(income);
            expect(parentBUSD).to.equal(income);
        }
        const reward = await mlm.reward(busd.address);
        expect(eth(joinAmount[level])).to.equal(totalIncome.add(reward));
    });
    it("upgrade leve 1", async function () {
        const level = 2;
        let upline = _owner;
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, 1, `aa${layer}`);
            upline = address[layer];
        }
        const addrSigner = await ethers.getSigner(address[8]);

        let oldBalance = [];
        oldBalance[0] = await mlm.userIncome(_owner, busd.address);
        for (let layer = 1; layer < 9; layer++) {
            const _oldBalance = await mlm.userIncome(
                address[layer - 1],
                busd.address
            );
            oldBalance[layer] = _oldBalance;
        }

        const oldReward = await mlm.reward(busd.address);

        const upgradeInfo = await mlm.userData(address[8]);
        expect(upgradeInfo.grade).to.equal(level - 1);
        const oldBal = await busd.balanceOf(address[8]);
        const upgradeAmount = await mlm.upgradeNeedAmount(level, address[8]);
        await mlm.connect(addrSigner).upgrade(level, busd.address);
        const newBal = await busd.balanceOf(address[8]);
        expect(oldBal.sub(newBal)).to.equal(upgradeAmount);
        const userData = await mlm.userData(address[8]);
        expect(userData.grade).to.equal(level);
        let totalIncome = BigNumber.from(0);
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            const income = await mlm.calculatorMyCommission(
                parent,
                address[8],
                BigNumber.from(eth(joinAmount[level])).sub(
                    BigNumber.from(eth(joinAmount[level - 1]))
                )
            );
            totalIncome = totalIncome.add(income);
            expect(BigNumber.from(parentBUSD).sub(oldBalance[layer])).to.equal(
                income
            );
        }
        const reward = await mlm.reward(busd.address);
        expect(eth(joinAmount[level]).sub(eth(joinAmount[level - 1]))).to.equal(
            totalIncome.add(reward).sub(oldReward)
        );
    });
    it("upgrade leve and auto upgrade", async function () {
        let upline = _owner;
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, 2, `aa${layer}`);
            upline = address[layer];
        }
        const addrSigner = await ethers.getSigner(address[8]);

        let oldBalance = [];
        oldBalance[0] = await mlm.userIncome(_owner, busd.address);
        for (let layer = 1; layer < 9; layer++) {
            const _oldBalance = await mlm.userIncome(
                address[layer - 1],
                busd.address
            );
            oldBalance[layer] = _oldBalance;
        }

        const oldReward = await mlm.reward(busd.address);

        const upgradeInfo = await mlm.userData(address[8]);
        const level = upgradeInfo.grade.add(1);
        const oldBal = await busd.balanceOf(address[8]);
        const upgradeAmount = await mlm.upgradeNeedAmount(level, address[8]);
        await mlm.connect(addrSigner).upgrade(level, busd.address);
        const newBal = await busd.balanceOf(address[8]);
        expect(oldBal.sub(newBal)).to.equal(upgradeAmount);
        const userData = await mlm.userData(address[8]);
        expect(userData.grade).to.equal(level);
        let totalIncome = BigNumber.from(0);
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            const income = await mlm.calculatorMyCommission(
                parent,
                address[8],
                BigNumber.from(eth(joinAmount[level])).sub(
                    BigNumber.from(eth(joinAmount[level - 1]))
                )
            );
            totalIncome = totalIncome.add(income);
            expect(BigNumber.from(parentBUSD).sub(oldBalance[layer])).to.equal(
                income
            );
        }
        const reward = await mlm.reward(busd.address);
        expect(eth(joinAmount[level]).sub(eth(joinAmount[level - 1]))).to.equal(
            totalIncome.add(reward).sub(oldReward)
        );
    });
    it("renew", async function () {
        let upline = _owner;
        for (let layer = 0; layer < 9; layer++) {
            const addrSigner = await ethers.getSigner(address[layer]);
            await busd
                .connect(addrSigner)
                .approve(mlm.address, ethers.constants.MaxUint256);
            await mlm
                .connect(addrSigner)
                .join(busd.address, upline, 1, `aa${layer}`);
            upline = address[layer];
        }
        const addrSigner = await ethers.getSigner(address[8]);

        let oldBalance = [];
        oldBalance[0] = await mlm.userIncome(_owner, busd.address);
        for (let layer = 1; layer < 9; layer++) {
            const _oldBalance = await mlm.userIncome(
                address[layer - 1],
                busd.address
            );
            oldBalance[layer] = _oldBalance;
        }

        const oldReward = await mlm.reward(busd.address);

        const upgradeInfo = await mlm.userData(address[8]);
        const oldBal = await busd.balanceOf(address[8]);
        await mlm.connect(addrSigner).renew(busd.address);
        const newBal = await busd.balanceOf(address[8]);
        expect(oldBal.sub(newBal)).to.equal(eth(joinAmount[upgradeInfo.grade]));
        const userData = await mlm.userData(address[8]);
        expect(userData.expireTime).to.equal(
            upgradeInfo.expireTime.add(365 * 24 * 60 * 60)
        );
        let totalIncome = BigNumber.from(0);
        for (let layer = 8; layer >= 0; layer--) {
            const parent = layer > 0 ? address[layer - 1] : _owner;
            const parentBUSD = await mlm.userIncome(parent, busd.address);
            const income = await mlm.calculatorMyCommission(
                parent,
                address[8],
                eth(joinAmount[upgradeInfo.grade])
            );
            totalIncome = totalIncome.add(income);
            expect(BigNumber.from(parentBUSD).sub(oldBalance[layer])).to.equal(
                income
            );
        }
        const reward = await mlm.reward(busd.address);
        expect(eth(joinAmount[upgradeInfo.grade])).to.equal(
            totalIncome.add(reward).sub(oldReward)
        );
    });
    it("claim", async function () {
        let upline = _owner;
        const addrSigner = await ethers.getSigner(address[0]);
        await busd
            .connect(addrSigner)
            .approve(mlm.address, ethers.constants.MaxUint256);
        await mlm.connect(addrSigner).join(busd.address, upline, 1, `aaa1`);
        const mlmBal = await busd.balanceOf(mlm.address);
        const ownerBal = await busd.balanceOf(_owner);
        const ownerIncome = await mlm.userIncome(_owner, busd.address);
        await mlm.connect(ownerSigner).claim(busd.address);
        const mlmBal2 = await busd.balanceOf(mlm.address);
        const ownerBal2 = await busd.balanceOf(_owner);
        const ownerWithdraw = await mlm.userWithdraw(_owner, busd.address);
        expect(mlmBal.sub(mlmBal2)).to.equal(ownerIncome);
        expect(ownerBal2.sub(ownerBal)).to.equal(ownerIncome);
        expect(ownerIncome.sub(ownerWithdraw)).to.equal(0);
    });
    it("claim all", async function () {
        let upline = _owner;
        const addrSigner = await ethers.getSigner(address[0]);
        await busd
            .connect(addrSigner)
            .approve(mlm.address, ethers.constants.MaxUint256);
        await mlm.connect(addrSigner).join(busd.address, upline, 1, `aaa1`);
        const addr1Signer = await ethers.getSigner(address[1]);
        await usdt
            .connect(addr1Signer)
            .approve(mlm.address, ethers.constants.MaxUint256);
        await usdt.mint(address[1], eth(1000));
        await mlm.connect(addr1Signer).join(usdt.address, upline, 1, `aaa2`);

        const mlmBalBusd = await busd.balanceOf(mlm.address);
        const ownerBalBusd = await busd.balanceOf(_owner);
        const ownerIncomeBusd = await mlm.userIncome(_owner, busd.address);
        const mlmBalUsdt = await usdt.balanceOf(mlm.address);
        const ownerBalUsdt = await usdt.balanceOf(_owner);
        const ownerIncomeUsdt = await mlm.userIncome(_owner, usdt.address);
        await mlm.connect(ownerSigner).claimAll([busd.address, usdt.address]);
        const mlmBalBusd1 = await busd.balanceOf(mlm.address);
        const ownerBalBusd1 = await busd.balanceOf(_owner);
        const ownerWithdrawBusd = await mlm.userWithdraw(_owner, busd.address);
        const mlmBalUsdt1 = await usdt.balanceOf(mlm.address);
        const ownerBalUsdt1 = await usdt.balanceOf(_owner);
        const ownerWithdrawUsdt = await mlm.userWithdraw(_owner, usdt.address);
        expect(mlmBalBusd.sub(mlmBalBusd1)).to.equal(ownerIncomeBusd);
        expect(mlmBalUsdt.sub(mlmBalUsdt1)).to.equal(ownerIncomeUsdt);
        expect(ownerBalBusd1.sub(ownerBalBusd)).to.equal(ownerIncomeBusd);
        expect(ownerBalUsdt1.sub(ownerBalUsdt)).to.equal(ownerIncomeUsdt);
        expect(ownerIncomeBusd.sub(ownerWithdrawBusd)).to.equal(0);
        expect(ownerIncomeUsdt.sub(ownerWithdrawUsdt)).to.equal(0);
    });
});
