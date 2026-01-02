import React, { useState, useEffect } from "react";
import { getProducts } from "../services/api";

function ProductList({ addToCart }) {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [categoryFilter, setCategoryFilter] = useState("");

	useEffect(() => {
		fetchProducts();
	}, [categoryFilter]);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const params = categoryFilter ? { category: categoryFilter } : {};
			const response = await getProducts(params);
			setProducts(response.data || []);
			setError(null);
		} catch (err) {
			setError("Failed to load products. Please try again later.");
			console.error("Error fetching products:", err);
		} finally {
			setLoading(false);
		}
	};

	const getStockClass = (stock) => {
		if (stock === 0) return "out";
		if (stock < 10) return "low";
		return "";
	};

	const getStockText = (stock) => {
		if (stock === 0) return "Out of stock";
		if (stock < 10) return `Only ${stock} left`;
		return `${stock} in stock`;
	};

	// Get unique categories
	const categories = [
		...new Set(products.map((p) => p.category).filter(Boolean)),
	];

	if (loading) {
		return (
			<div className="loading">
				<div className="loading-spinner"></div>
				<p>Loading products...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="error-message">{error}</div>
				<button className="btn btn-primary" onClick={fetchProducts}>
					Try Again
				</button>
			</div>
		);
	}

	return (
		<div>
			<h1 className="page-title">Our Products</h1>

			{/* Category Filter */}
			{categories.length > 0 && (
				<div style={{ marginBottom: "2rem" }}>
					<select
						className="form-input"
						style={{ maxWidth: "200px" }}
						value={categoryFilter}
						onChange={(e) => setCategoryFilter(e.target.value)}
					>
						<option value="">All Categories</option>
						{categories.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</div>
			)}

			{products.length === 0 ? (
				<div className="empty-state">
					<div className="empty-state-icon">📦</div>
					<h2>No products found</h2>
					<p>Check back later for new products!</p>
				</div>
			) : (
				<div className="products-grid">
					{products.map((product) => (
						<div key={product.id} className="product-card">
							<div className="product-image">
								{product.image_url ? (
									<img src={product.image_url} alt={product.name} />
								) : (
									"📦"
								)}
							</div>
							<div className="product-info">
								{product.category && (
									<span className="product-category">{product.category}</span>
								)}
								<h3 className="product-name">{product.name}</h3>
								<p className="product-description">
									{product.description?.substring(0, 100)}
									{product.description?.length > 100 ? "..." : ""}
								</p>
								<div className="product-footer">
									<span className="product-price">
										${Number(product.price).toFixed(2)}
									</span>
									<span
										className={`product-stock ${getStockClass(product.stock)}`}
									>
										{getStockText(product.stock)}
									</span>
								</div>
								<button
									className="btn btn-primary"
									style={{ width: "100%", marginTop: "1rem" }}
									onClick={() => addToCart(product)}
									disabled={product.stock === 0}
								>
									{product.stock === 0 ? "Out of Stock" : "Add to Cart"}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default ProductList;
