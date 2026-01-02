import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createOrder } from "../services/api";

function Checkout({ cart, clearCart, showNotification }) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		customer_name: "",
		customer_email: "",
		shipping_address: "",
	});
	const [errors, setErrors] = useState({});

	const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

	const validateForm = () => {
		const newErrors = {};
		if (!formData.customer_name.trim()) {
			newErrors.customer_name = "Name is required";
		}
		if (!formData.customer_email.trim()) {
			newErrors.customer_email = "Email is required";
		} else if (!/\S+@\S+\.\S+/.test(formData.customer_email)) {
			newErrors.customer_email = "Invalid email format";
		}
		if (!formData.shipping_address.trim()) {
			newErrors.shipping_address = "Shipping address is required";
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) return;
		if (cart.length === 0) {
			showNotification("Your cart is empty", "error");
			return;
		}

		setLoading(true);
		try {
			const orderData = {
				...formData,
				items: cart.map((item) => ({
					product_id: item.id,
					quantity: item.quantity,
				})),
			};

			const response = await createOrder(orderData);
			clearCart();
			showNotification("Order placed successfully!");
			navigate("/orders");
		} catch (error) {
			const errorMessage =
				error.response?.data?.error ||
				"Failed to place order. Please try again.";
			showNotification(errorMessage, "error");
			console.error("Error creating order:", error);
		} finally {
			setLoading(false);
		}
	};

	if (cart.length === 0) {
		return (
			<div className="cart-container">
				<h1 className="page-title">Checkout</h1>
				<div className="empty-state">
					<div className="empty-state-icon">🛒</div>
					<h2>Your cart is empty</h2>
					<p>Add some products before checkout!</p>
					<Link
						to="/"
						className="btn btn-primary"
						style={{ marginTop: "1rem", display: "inline-block" }}
					>
						Browse Products
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div>
			<h1 className="page-title">Checkout</h1>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 400px",
					gap: "2rem",
				}}
			>
				{/* Checkout Form */}
				<div className="cart-container">
					<h2 style={{ marginBottom: "1.5rem" }}>Shipping Information</h2>

					<form onSubmit={handleSubmit}>
						<div className="form-group">
							<label className="form-label">Full Name</label>
							<input
								type="text"
								name="customer_name"
								className="form-input"
								value={formData.customer_name}
								onChange={handleChange}
								placeholder="John Doe"
							/>
							{errors.customer_name && (
								<span style={{ color: "#f44336", fontSize: "0.875rem" }}>
									{errors.customer_name}
								</span>
							)}
						</div>

						<div className="form-group">
							<label className="form-label">Email Address</label>
							<input
								type="email"
								name="customer_email"
								className="form-input"
								value={formData.customer_email}
								onChange={handleChange}
								placeholder="john@example.com"
							/>
							{errors.customer_email && (
								<span style={{ color: "#f44336", fontSize: "0.875rem" }}>
									{errors.customer_email}
								</span>
							)}
						</div>

						<div className="form-group">
							<label className="form-label">Shipping Address</label>
							<textarea
								name="shipping_address"
								className="form-input"
								value={formData.shipping_address}
								onChange={handleChange}
								placeholder="123 Main St, City, State, ZIP"
								rows="3"
							/>
							{errors.shipping_address && (
								<span style={{ color: "#f44336", fontSize: "0.875rem" }}>
									{errors.shipping_address}
								</span>
							)}
						</div>

						<div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
							<Link to="/cart" className="btn btn-secondary">
								Back to Cart
							</Link>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={loading}
							>
								{loading ? "Placing Order..." : "Place Order"}
							</button>
						</div>
					</form>
				</div>

				{/* Order Summary */}
				<div className="cart-container">
					<h2 style={{ marginBottom: "1.5rem" }}>Order Summary</h2>

					{cart.map((item) => (
						<div
							key={item.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								padding: "0.75rem 0",
								borderBottom: "1px solid #eee",
							}}
						>
							<div>
								<div style={{ fontWeight: 500 }}>{item.name}</div>
								<div style={{ color: "#666", fontSize: "0.875rem" }}>
									Qty: {item.quantity}
								</div>
							</div>
							<div style={{ fontWeight: 500 }}>
								${(item.price * item.quantity).toFixed(2)}
							</div>
						</div>
					))}

					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: "1.5rem",
							paddingTop: "1rem",
							borderTop: "2px solid #eee",
							fontSize: "1.25rem",
							fontWeight: 700,
						}}
					>
						<span>Total:</span>
						<span>${total.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Checkout;
