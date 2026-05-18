export const fallbackData = {
  fetchedAt: "2026-05-18T00:00:00.000Z",
  sourceUrl: "https://onre.hanyon.app/",
  meta: {
    totalTvl: 173370000,
    totalTvlLabel: "$173.37M",
    activePartners: 7,
    tvl30dChangePct: 0.1707,
    currentApy: 0.1192,
    realizedApy30d: 0.1116,
    totalPoints: 89510734997,
    totalPointsLabel: "89.51B",
    dailyPointsAvg7d: 707680000,
    dailyPointsAvg7dLabel: "707.68M",
    wallets: 15009,
    latestPointsDate: "2026-05-18",
    dailyUpdateTimeGmt: "01:00 GMT"
  },
  distribution: [
    { protocol: "kamino", capitalUsd: 87782176.62, sharePct: 0.506319 },
    { protocol: "loopscale", capitalUsd: 32756995.09, sharePct: 0.188939 },
    { protocol: "wallet", capitalUsd: 24649716.84, sharePct: 0.142191 },
    { protocol: "exponent", capitalUsd: 13060273.06, sharePct: 0.07533 },
    { protocol: "orca", capitalUsd: 8357110.68, sharePct: 0.048214 },
    { protocol: "elemental", capitalUsd: 6637296.93, sharePct: 0.038283 },
    { protocol: "carrot", capitalUsd: 121676.7, sharePct: 0.000702 }
  ],
  tvl: [
    { date: "2026-05-12", kamino: 81200000, loopscale: 31200000, wallet: 22900000, exponent: 11600000, orca: 7720000, elemental: 5900000, carrot: 98000 },
    { date: "2026-05-13", kamino: 82900000, loopscale: 31800000, wallet: 23100000, exponent: 12000000, orca: 7900000, elemental: 6120000, carrot: 104000 },
    { date: "2026-05-14", kamino: 84100000, loopscale: 32100000, wallet: 23800000, exponent: 12400000, orca: 8080000, elemental: 6250000, carrot: 111000 },
    { date: "2026-05-15", kamino: 85900000, loopscale: 32600000, wallet: 24200000, exponent: 12700000, orca: 8200000, elemental: 6420000, carrot: 116000 },
    { date: "2026-05-16", kamino: 86900000, loopscale: 32700000, wallet: 24400000, exponent: 12900000, orca: 8280000, elemental: 6540000, carrot: 119000 },
    { date: "2026-05-17", kamino: 87500000, loopscale: 32730000, wallet: 24540000, exponent: 13030000, orca: 8330000, elemental: 6610000, carrot: 120000 },
    { date: "2026-05-18", kamino: 87782176.62, loopscale: 32756995.09, wallet: 24649716.84, exponent: 13060273.06, orca: 8357110.68, elemental: 6637296.93, carrot: 121676.7 }
  ],
  yieldSeries: [
    { date: "2026-05-12", nav: 1.10192, cumulativeReturn: 0.09212, apy7d: 0.1162, apy30d: 0.1101 },
    { date: "2026-05-13", nav: 1.10234, cumulativeReturn: 0.09254, apy7d: 0.1171, apy30d: 0.1104 },
    { date: "2026-05-14", nav: 1.10279, cumulativeReturn: 0.09298, apy7d: 0.1188, apy30d: 0.1108 },
    { date: "2026-05-15", nav: 1.10319, cumulativeReturn: 0.09338, apy7d: 0.1193, apy30d: 0.1111 },
    { date: "2026-05-16", nav: 1.10361, cumulativeReturn: 0.0938, apy7d: 0.1191, apy30d: 0.1112 },
    { date: "2026-05-17", nav: 1.10396, cumulativeReturn: 0.09415, apy7d: 0.1193, apy30d: 0.1114 },
    { date: "2026-05-18", nav: 1.104272, cumulativeReturn: 0.0945, apy7d: 0.1192, apy30d: 0.1116 }
  ],
  pointsSeries: [
    { date: "2026-05-12", totalPointsIssued: 85264330000, dailyTotalGrowth: 633520000 },
    { date: "2026-05-13", totalPointsIssued: 85927590000, dailyTotalGrowth: 663260000 },
    { date: "2026-05-14", totalPointsIssued: 86623710000, dailyTotalGrowth: 696120000 },
    { date: "2026-05-15", totalPointsIssued: 87332660000, dailyTotalGrowth: 708950000 },
    { date: "2026-05-16", totalPointsIssued: 88052030000, dailyTotalGrowth: 719370000 },
    { date: "2026-05-17", totalPointsIssued: 88797490000, dailyTotalGrowth: 745460000 },
    { date: "2026-05-18", totalPointsIssued: 89510734997, dailyTotalGrowth: 713244997 }
  ],
  holderBuckets: [
    { label: "1 - 999", count: 2239, points: 539958 },
    { label: "1K - 10K", count: 2247, points: 9647397 },
    { label: "10K - 100K", count: 3389, points: 135734009 },
    { label: "100K - 1M", count: 3534, points: 1346081276 },
    { label: "1M - 5M", count: 2037, points: 4765289247 },
    { label: "5M - 10M", count: 622, points: 4391520700 },
    { label: "10M - 50M", count: 691, points: 14323447054 },
    { label: "50M+", count: 250, points: 64538305356 }
  ],
  topBreakdown: [
    { tier: "Top 1%", color: "var(--accent)", thresholdLabel: "83.81M", wallets: 150, walletPct: 0.01, pointsLabel: "56.79B", pointsPct: 0.6345 },
    { tier: "Top 5%", color: "#FFD96B", thresholdLabel: "13.87M", wallets: 600, walletPct: 0.04, pointsLabel: "19.81B", pointsPct: 0.2213 },
    { tier: "Top 10%", color: "#A78BFA", thresholdLabel: "5.28M", wallets: 750, walletPct: 0.05, pointsLabel: "6.33B", pointsPct: 0.0707 },
    { tier: "Top 25%", color: "#06B6D4", thresholdLabel: "898.75K", wallets: 2252, walletPct: 0.15, pointsLabel: "5.23B", pointsPct: 0.0585 },
    { tier: "Top 50%", color: "#10B981", thresholdLabel: "80.03K", wallets: 3752, walletPct: 0.25, pointsLabel: "1.23B", pointsPct: 0.0138 },
    { tier: "Bottom 50%", color: "var(--muted-2)", thresholdLabel: "1", wallets: 7505, walletPct: 0.5, pointsLabel: "112.97M", pointsPct: 0.0013 }
  ],
  wallets: [
    { rank: 1, address: "DTjNdfYmKpwGjnX6UPGvxwXQ7PZEGM7M43BQLtyASnvh", totalPoints: 10948707836, wallet: 9, kamino: 3418269297, loopscale: 7302335800, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 12140087, carrot: 215962640, referralBonus: 0 },
    { rank: 2, address: "AR6xVAao2vkxK716v1F1AcWwZbFYuBGLSE3T5Dto219n", totalPoints: 2920963685, wallet: 125626, kamino: 1648142024, loopscale: 949012615, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 0, carrot: 323683419, referralBonus: 0 },
    { rank: 3, address: "63jW9AKCZxSPrUgPtk53DSaz6AR6Tz38abgewvnTEjG8", totalPoints: 2489400201, wallet: 404231230, kamino: 0, loopscale: 2085168970, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 0, carrot: 0, referralBonus: 0 },
    { rank: 4, address: "E3NiM5n6s5CKKWrrhaeVjVSTKscRrysCtZeXnxn6yMgp", totalPoints: 2283524393, wallet: 3800444, kamino: 2172971611, loopscale: 0, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 106752337, carrot: 0, referralBonus: 0 },
    { rank: 5, address: "ASQ4kYjSYGUYbbYtsaLhUeJS6RtrN4Uwp4XbF4gDifvr", totalPoints: 1552075009, wallet: 71309778, kamino: 469717616, loopscale: 0, exponentYt: 429426675, exponentLp: 581620939, orca: 0, elemental: 0, carrot: 0, referralBonus: 0 },
    { rank: 6, address: "7p6LQRCo24aMkNHmiDahBXMFqkW3MFbny629qdR2J1A5", totalPoints: 1470530153, wallet: 31604005, kamino: 1334890365, loopscale: 0, exponentYt: 0, exponentLp: 0, orca: 104035781, elemental: 0, carrot: 0, referralBonus: 0 },
    { rank: 7, address: "2y2TFrza1RokBcqBheMURD4fGhnX84yoDCLmgigUaU1m", totalPoints: 1389027799, wallet: 100885, kamino: 1017646353, loopscale: 371280559, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 0, carrot: 0, referralBonus: 0 },
    { rank: 8, address: "DW73f8azs8ymsriRMiKcBBrB2i8tSaDV7Gy2GLa6F7t1", totalPoints: 987473116, wallet: 0, kamino: 0, loopscale: 0, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 0, carrot: 987473116, referralBonus: 0 },
    { rank: 9, address: "3NQrjCmHTZhpeLHoiQii2nHAvuKqTbX6vREMGrfpRJmF", totalPoints: 819258778, wallet: 298871918, kamino: 283386860, loopscale: 237000000, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 0, carrot: 0, referralBonus: 0 },
    { rank: 10, address: "H5YMpUebP9KJiLy19oUJPNpkAw5qtS9vEtf8NC1ovRho", totalPoints: 774728411, wallet: 118129198, kamino: 18978602, loopscale: 636117642, exponentYt: 0, exponentLp: 0, orca: 0, elemental: 0, carrot: 0, referralBonus: 0 }
  ]
};
