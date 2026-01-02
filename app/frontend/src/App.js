import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import Orders from "./components/Orders";
import Checkout from "./components/Checkout";
import api from "./services/api";

function App() {
	const [cart, setCart] = useState([]);
	const [notification, setNotification] = useState(null);

	// Load cart from localStorage
	useEffect(() => {
		const savedCart = localStorage.getItem("cart");
		if (savedCart) {
			setCart(JSON.parse(savedCart));
		}
	}, []);

	// Save cart to localStorage
	useEffect(() => {
		localStorage.setItem("cart", JSON.stringify(cart));
	}, [cart]);

	const addToCart = (product) => {
		setCart((prevCart) => {
			const existingItem = prevCart.find((item) => item.id === product.id);
			if (existingItem) {
				return prevCart.map((item) =>
					item.id === product.id
						? { ...item, quantity: item.quantity + 1 }
						: item
				);
			}
			return [...prevCart, { ...product, quantity: 1 }];
		});
		showNotification("Product added to cart!");
	};

	const removeFromCart = (productId) => {
		setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
	};

	const updateQuantity = (productId, quantity) => {
		if (quantity < 1) {
			removeFromCart(productId);
			return;
		}
		setCart((prevCart) =>
			prevCart.map((item) =>
				item.id === productId ? { ...item, quantity } : item
			)
		);
	};

	const clearCart = () => {
		setCart([]);
		localStorage.removeItem("cart");
	};

	const showNotification = (message, type = "success") => {
		setNotification({ message, type });
		setTimeout(() => setNotification(null), 3000);
	};

	const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<Router>
			<div className="app">
				<header className="header">
					<div className="container header-content">
						<Link to="/" className="logo">
							🛒 E-Commerce Store
						</Link>
						<nav>
							<ul className="nav-links">
								<li>
									<Link to="/">Products</Link>
								</li>
								<li>
									<Link to="/orders">Orders</Link>
								</li>
								<li>
									<Link to="/cart" className="cart-icon">
										🛍️ Cart
										{cartItemCount > 0 && (
											<span className="cart-count">{cartItemCount}</span>
										)}
									</Link>
								</li>
							</ul>
						</nav>
					</div>
				</header>

				{notification && (
					<div
						className={`container ${
							notification.type === "success"
								? "success-message"
								: "error-message"
						}`}
						style={{ marginTop: "1rem" }}
					>
						{notification.message}
					</div>
				)}

				<main className="container">
					<Routes>
						<Route path="/" element={<ProductList addToCart={addToCart} />} />
						<Route
							path="/cart"
							element={
								<Cart
									cart={cart}
									updateQuantity={updateQuantity}
									removeFromCart={removeFromCart}
								/>
							}
						/>
						<Route
							path="/checkout"
							element={
								<Checkout
									cart={cart}
									clearCart={clearCart}
									showNotification={showNotification}
								/>
							}
						/>
						<Route path="/orders" element={<Orders />} />
					</Routes>
				</main>

				<footer className="footer">
					<div className="container">
						<p>© 2024 E-Commerce Microservices - DevOps Mini Project</p>
					</div>
				</footer>
			</div>
		</Router>
	);
}

export default App;
