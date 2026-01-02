import axios from "axios";

// API base URLs - these will be replaced by environment variables in production
const PRODUCT_API_URL =
	process.env.REACT_APP_PRODUCT_API_URL || "/api/products";
const ORDER_API_URL = process.env.REACT_APP_ORDER_API_URL || "/api/orders";

// Create axios instances
const productApi = axios.create({
	baseURL: PRODUCT_API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

const orderApi = axios.create({
	baseURL: ORDER_API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Product API functions
export const getProducts = async (params = {}) => {
	const response = await productApi.get("/", { params });
	return response.data;
};

export const getProduct = async (id) => {
	const response = await productApi.get(`/${id}`);
	return response.data;
};

// Order API functions
export const getOrders = async (params = {}) => {
	const response = await orderApi.get("/", { params });
	return response.data;
};

export const getOrder = async (id) => {
	const response = await orderApi.get(`/${id}`);
	return response.data;
};

export const createOrder = async (orderData) => {
	const response = await orderApi.post("/", orderData);
	return response.data;
};

export const updateOrderStatus = async (id, status) => {
	const response = await orderApi.patch(`/${id}/status`, { status });
	return response.data;
};

// Health check functions
export const checkProductServiceHealth = async () => {
	try {
		const response = await axios.get(
			`${PRODUCT_API_URL.replace("/api/products", "")}/health`
		);
		return response.data;
	} catch (error) {
		return { status: "unhealthy", error: error.message };
	}
};

export const checkOrderServiceHealth = async () => {
	try {
		const response = await axios.get(
			`${ORDER_API_URL.replace("/api/orders", "")}/health`
		);
		return response.data;
	} catch (error) {
		return { status: "unhealthy", error: error.message };
	}
};

export default {
	getProducts,
	getProduct,
	getOrders,
	getOrder,
	createOrder,
	updateOrderStatus,
	checkProductServiceHealth,
	checkOrderServiceHealth,
};
