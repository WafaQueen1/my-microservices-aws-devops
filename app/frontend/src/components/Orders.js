import React, { useState, useEffect } from "react";
import { getOrders } from "../services/api";

function Orders() {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchOrders();
	}, []);

	const fetchOrders = async () => {
		try {
			setLoading(true);
			const response = await getOrders();
			setOrders(response.data || []);
			setError(null);
		} catch (err) {
			setError("Failed to load orders. Please try again later.");
			console.error("Error fetching orders:", err);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<div className="loading">
				<div className="loading-spinner"></div>
				<p>Loading orders...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="error-message">{error}</div>
				<button className="btn btn-primary" onClick={fetchOrders}>
					Try Again
				</button>
			</div>
		);
	}

	return (
		<div>
			<h1 className="page-title">My Orders</h1>

			{orders.length === 0 ? (
				<div className="empty-state">
					<div className="empty-state-icon">📋</div>
					<h2>No orders yet</h2>
					<p>Your orders will appear here after checkout.</p>
				</div>
			) : (
				<div className="orders-container">
					{orders.map((order) => (
						<div key={order.id} className="order-card">
							<div className="order-header">
								<div>
									<span className="order-id">
										Order #{order.id.substring(0, 8)}
									</span>
									<div
										style={{
											color: "#666",
											fontSize: "0.875rem",
											marginTop: "0.25rem",
										}}
									>
										{formatDate(order.created_at)}
									</div>
								</div>
								<span className={`order-status ${order.status}`}>
									{order.status}
								</span>
							</div>

							<div style={{ marginBottom: "1rem" }}>
								<div style={{ color: "#666", fontSize: "0.875rem" }}>
									<strong>Ship to:</strong> {order.customer_name}
								</div>
								<div style={{ color: "#666", fontSize: "0.875rem" }}>
									{order.shipping_address}
								</div>
							</div>

							{order.items && order.items.length > 0 && (
								<div>
									<div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
										Items:
									</div>
									{order.items.map((item) => (
										<div
											key={item.id}
											style={{
												display: "flex",
												justifyContent: "space-between",
												padding: "0.5rem 0",
												borderBottom: "1px solid #f0f0f0",
											}}
										>
											<span>
												{item.product_name} × {item.quantity}
											</span>
											<span>${Number(item.total_price).toFixed(2)}</span>
										</div>
									))}
								</div>
							)}

							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
									marginTop: "1rem",
									paddingTop: "1rem",
									borderTop: "2px solid #eee",
									fontSize: "1.1rem",
									fontWeight: 700,
								}}
							>
								<span>Total: ${Number(order.total_amount).toFixed(2)}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default Orders;
