import React from "react";
import { Link } from "react-router-dom";

function Cart({ cart, updateQuantity, removeFromCart }) {
	const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

	if (cart.length === 0) {
		return (
			<div className="cart-container">
				<h1 className="page-title">Shopping Cart</h1>
				<div className="empty-state">
					<div className="empty-state-icon">🛒</div>
					<h2>Your cart is empty</h2>
					<p>Add some products to get started!</p>
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
		<div className="cart-container">
			<h1 className="page-title">Shopping Cart</h1>

			{cart.map((item) => (
				<div key={item.id} className="cart-item">
					<div className="cart-item-info">
						<div className="cart-item-name">{item.name}</div>
						<div className="cart-item-price">
							${Number(item.price).toFixed(2)} each
						</div>
					</div>

					<div className="cart-item-quantity">
						<button
							className="quantity-btn"
							onClick={() => updateQuantity(item.id, item.quantity - 1)}
						>
							-
						</button>
						<span>{item.quantity}</span>
						<button
							className="quantity-btn"
							onClick={() => updateQuantity(item.id, item.quantity + 1)}
							disabled={item.quantity >= item.stock}
						>
							+
						</button>
					</div>

					<div style={{ minWidth: "100px", textAlign: "right" }}>
						<strong>${(item.price * item.quantity).toFixed(2)}</strong>
					</div>

					<button
						className="btn btn-danger"
						style={{ marginLeft: "1rem" }}
						onClick={() => removeFromCart(item.id)}
					>
						Remove
					</button>
				</div>
			))}

			<div className="cart-summary">
				<div className="cart-total">
					<span>Total:</span>
					<span>${total.toFixed(2)}</span>
				</div>

				<div style={{ display: "flex", gap: "1rem" }}>
					<Link to="/" className="btn btn-secondary">
						Continue Shopping
					</Link>
					<Link to="/checkout" className="btn btn-primary">
						Proceed to Checkout
					</Link>
				</div>
			</div>
		</div>
	);
}

export default Cart;
