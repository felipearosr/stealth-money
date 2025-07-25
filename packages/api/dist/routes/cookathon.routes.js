"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cookathon_controller_1 = require("./cookathon.controller");
const router = (0, express_1.Router)();
/**
 * @route GET /api/cookathon/metrics
 * @desc Get comprehensive cookathon metrics for dashboard
 * @query timeframe - '24h', '7d', or '30d' (default: '24h')
 */
router.get('/metrics', (req, res) => cookathon_controller_1.cookathonController.getCookathonMetrics(req, res));
/**
 * @route GET /api/cookathon/network-stats
 * @desc Get live network statistics
 */
router.get('/network-stats', (req, res) => cookathon_controller_1.cookathonController.getNetworkStats(req, res));
/**
 * @route GET /api/cookathon/recent-transactions
 * @desc Get recent transactions for live feed
 * @query limit - Number of transactions to return (default: 10)
 */
router.get('/recent-transactions', (req, res) => cookathon_controller_1.cookathonController.getRecentTransactions(req, res));
/**
 * @route GET /api/cookathon/calculate-savings
 * @desc Calculate cost savings for a given amount
 * @query amount - Transfer amount in USD (default: 100)
 */
router.get('/calculate-savings', (req, res) => cookathon_controller_1.cookathonController.calculateSavings(req, res));
exports.default = router;
