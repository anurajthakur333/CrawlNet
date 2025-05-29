import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Elevation,
  H1,
  H2,
  H4,
  Spinner,
  Button,
  HTMLTable,
  Callout,
  InputGroup,
  Checkbox,
  ButtonGroup,
  Tag,
  Intent,
  Icon,
  Divider,
  Breadcrumbs,
  BreadcrumbProps,
  FormGroup,
  NumericInput,
} from "@blueprintjs/core";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;

interface Product {
  order_id: string;
  product_name: string;
  sku: string;
  price: string;
  quantity: string;
  subtotal: string;
  size?: string;
  filling?: string;
}

interface OrderInfo {
  order_number?: string;
  order_date?: string;
  order_status?: string;
  view_link?: string;
}

interface ProductFilters {
  searchTerm: string;
  showProductsWithSku: boolean;
  showProductsWithoutSku: boolean;
  minPrice: string;
  maxPrice: string;
}

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastFetchInfo, setLastFetchInfo] = useState<string | null>(null);
  const [navigateOrderId, setNavigateOrderId] = useState<string>("");
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<ProductFilters>({
    searchTerm: "",
    showProductsWithSku: true,
    showProductsWithoutSku: true,
    minPrice: "",
    maxPrice: "",
  });

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch order details from database
  const fetchOrderDetailsFromDb = async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedProducts(new Set());
    
    try {
      const response = await fetch(`${API_URL}/order_details_db/${orderId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.found) {
        setProducts(data.products || []);
        setOrderInfo(data.order_info || {});
        setFetched(true);
        setCurrentPage(1);
        setLastFetchInfo(`Loaded ${data.products?.length || 0} products from database`);
        
        // Update last refresh time
        setLastRefreshTime(new Date().toLocaleTimeString());
      } else if (data.success && !data.found) {
        setProducts([]);
        setOrderInfo({});
        setFetched(true);
        setLastFetchInfo("Order details not found in database");
        
        // Update last refresh time
        setLastRefreshTime(new Date().toLocaleTimeString());
      } else {
        setError(data.error || "Failed to fetch order details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Scrape fresh order details
  const scrapeOrderDetails = async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedProducts(new Set());
    
    try {
      const response = await fetch(`${API_URL}/order_details/${orderId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setOrderInfo(data.order_info || {});
        setFetched(true);
        setCurrentPage(1);
        setLastFetchInfo(`Scraped ${data.total_products || 0} products from order ${orderId}`);
        setSuccess(`Successfully scraped ${data.total_products || 0} products from order details!`);
      } else {
        setError(`Scraping error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Delete order details from database
  const deleteOrderDetails = async () => {
    if (!orderId) return;
    if (!window.confirm(`Are you sure you want to delete order details for order ${orderId}? This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API_URL}/order_details_db/${orderId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts([]);
        setOrderInfo({});
        setSelectedProducts(new Set());
        setCurrentPage(1);
        setLastFetchInfo(`Deleted order details for order ${orderId}`);
        setSuccess(`Successfully deleted order details for order ${orderId}!`);
      } else {
        setError(`Delete error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Delete entire order from database
  const deleteOrder = async () => {
    if (!orderId) return;
    if (!window.confirm(`Are you sure you want to permanently delete order ${orderId} from the database? This will delete both the order and all its details. This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API_URL}/order/${orderId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully deleted order ${orderId}! Redirecting to orders list...`);
        // Redirect to orders list after 2 seconds
        setTimeout(() => {
          navigate("/ohs/orders");
        }, 2000);
      } else {
        setError(`Delete error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Send single product to scraper
  const sendProductToScraper = async (product: Product, index: number) => {
    if (!product.sku || product.sku === "N/A") {
      setError("Cannot scrape product without SKU");
      return;
    }
    
    if (!window.confirm(`Send "${product.product_name}" (SKU: ${product.sku}) to product scraper?`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API_URL}/send_product_to_scraper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sku: product.sku,
          partial_name: product.product_name,
          order_id: orderId,
          order_number: orderInfo.order_number
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`${data.message}. You can check the progress in the Product Scraper tab.`);
      } else {
        setError(`Scraper error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Send multiple products to scraper
  const sendSelectedProductsToScraper = async () => {
    // Get the selected products that have SKUs
    const selectedProductsData = paginatedProducts.filter((product, index) => 
      selectedProducts.has(`${product.sku}-${index}`) && product.sku && product.sku !== "N/A"
    );
    
    if (selectedProductsData.length === 0) {
      setError("No valid products selected for scraping (products must have SKU)");
      return;
    }
    
    if (!window.confirm(`Send ${selectedProductsData.length} selected products to product scraper?`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const products = selectedProductsData.map(product => ({
        sku: product.sku,
        partial_name: product.product_name,
        order_id: orderId,
        order_number: orderInfo.order_number
      }));

      const response = await fetch(`${API_URL}/start_product_scraping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ products })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully queued ${selectedProductsData.length} products for scraping. You can check the progress in the Product Scraper tab.`);
        setSelectedProducts(new Set()); // Clear selection
      } else {
        setError(`Scraper error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Delete selected products from current order
  const deleteSelectedProducts = async () => {
    const selectedProductsData = paginatedProducts.filter((product, index) => 
      selectedProducts.has(`${product.sku}-${index}`)
    );
    
    if (selectedProductsData.length === 0) {
      setError("No products selected for deletion");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedProductsData.length} selected products from this order? This action cannot be undone.`)) {
      return;
    }
    
    // Remove selected products from the products array
    const selectedKeys = new Set(Array.from(selectedProducts));
    const updatedProducts = products.filter((product, index) => {
      const productKey = `${product.sku}-${index}`;
      return !selectedKeys.has(productKey);
    });
    
    setProducts(updatedProducts);
    setSelectedProducts(new Set());
    setSuccess(`Successfully removed ${selectedProductsData.length} products from the order.`);
  };

  // Navigate to different order
  const handleNavigateToOrder = () => {
    if (navigateOrderId && navigateOrderId !== orderId) {
      navigate(`/ohs/order-details/${navigateOrderId}`);
    }
  };

  // Initial load from DB
  useEffect(() => {
    if (orderId) {
      fetchOrderDetailsFromDb();
      setNavigateOrderId(orderId);
    }
  }, [orderId]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // SKU filter
      const hasSku = product.sku && product.sku !== "N/A";
      const skuFilter = 
        (filters.showProductsWithSku && hasSku) ||
        (filters.showProductsWithoutSku && !hasSku);

      if (!skuFilter) return false;

      // Search filter (search in name, SKU, size, filling)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          product.product_name.toLowerCase().includes(searchLower) ||
          (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
          (product.size && product.size.toLowerCase().includes(searchLower)) ||
          (product.filling && product.filling.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Price filter
      if (filters.minPrice || filters.maxPrice) {
        const priceText = product.price.replace(/[£$€,]/g, '');
        const price = parseFloat(priceText);
        
        if (!isNaN(price)) {
          if (filters.minPrice && price < parseFloat(filters.minPrice)) {
            return false;
          }
          if (filters.maxPrice && price > parseFloat(filters.maxPrice)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [products, filters]);

  // Pagination
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Calculate totals
  const orderTotals = useMemo(() => {
    const totalQuantity = products.reduce((sum, product) => {
      const qty = parseInt(product.quantity) || 0;
      return sum + qty;
    }, 0);

    const totalValue = products.reduce((sum, product) => {
      const subtotalText = product.subtotal.replace(/[£$€,]/g, '');
      const subtotal = parseFloat(subtotalText) || 0;
      return sum + subtotal;
    }, 0);

    return {
      totalQuantity,
      totalValue: totalValue.toFixed(2)
    };
  }, [products]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(paginatedProducts.map((product, index) => `${product.sku}-${index}`)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productKey: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productKey);
    } else {
      newSelected.delete(productKey);
    }
    setSelectedProducts(newSelected);
  };

  const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every((product, index) => 
    selectedProducts.has(`${product.sku}-${index}`)
  );
  const isIndeterminate = paginatedProducts.some((product, index) => 
    selectedProducts.has(`${product.sku}-${index}`)
  ) && !isAllSelected;

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      showProductsWithSku: true,
      showProductsWithoutSku: true,
      minPrice: "",
      maxPrice: "",
    });
    setCurrentPage(1);
  };

  // CSV Export functionality
  const convertToCSV = (products: Product[]) => {
    const headers = [
      "S.No",
      "Order ID",
      "Product Name", 
      "SKU", 
      "Size", 
      "Filling",
      "Price", 
      "Quantity",
      "Subtotal"
    ];
    
    const csvRows = products.map((product, index) => [
      `"${index + 1}"`,
      `"${product.order_id}"`,
      `"${product.product_name}"`,
      `"${product.sku || 'N/A'}"`,
      `"${product.size || 'N/A'}"`,
      `"${product.filling || 'N/A'}"`,
      `"${product.price}"`,
      `"${product.quantity}"`,
      `"${product.subtotal}"`
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");
    
    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      } else {
        throw new Error("Browser doesn't support file download");
      }
    } catch (err) {
      setError(`Failed to download CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const exportSelectedProducts = () => {
    // Get the selected products
    const selectedProductsData = paginatedProducts.filter((product, index) => 
      selectedProducts.has(`${product.sku}-${index}`)
    );
    
    if (selectedProductsData.length === 0) {
      setError("No products selected for export");
      return;
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `order_${orderId}_selected_products_${timestamp}.csv`;
    
    // Convert to CSV and download
    const csvContent = convertToCSV(selectedProductsData);
    downloadCSV(csvContent, filename);
    
    // Show success message
    setSuccess(`Successfully exported ${selectedProductsData.length} selected products to ${filename}`);
  };

  const exportAllFilteredProducts = () => {
    if (filteredProducts.length === 0) {
      setError("No products to export");
      return;
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `order_${orderId}_all_products_${timestamp}.csv`;
    
    // Convert to CSV and download
    const csvContent = convertToCSV(filteredProducts);
    downloadCSV(csvContent, filename);
    
    // Show success message
    setSuccess(`Successfully exported ${filteredProducts.length} products to ${filename}`);
  };

  // Breadcrumbs
  const breadcrumbs: BreadcrumbProps[] = [
    { href: "/ohs", icon: "home", text: "OHS" },
    { href: "/ohs/orders", icon: "list", text: "Orders" },
    { icon: "document", text: `Order ${orderId}` },
  ];

  if (!orderId) {
    return (
      <div style={{ marginTop: "80px", padding: "20px" }}>
        <Callout intent="danger" icon="error">
          No order ID provided in URL
        </Callout>
      </div>
    );
  }

  return (
    <div style={{ 
      marginTop: "80px",
      width: "100%",
      paddingLeft: "20px",
      paddingRight: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Breadcrumbs */}
      <Card elevation={Elevation.ONE} style={{ marginBottom: "20px", padding: "15px" }}>
        <Breadcrumbs items={breadcrumbs} />
      </Card>

      {/* Header Card */}
      <Card elevation={Elevation.THREE} style={{ 
        padding: "30px", 
        marginBottom: "20px",
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        color: "white"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <H1 style={{ 
              margin: 0, 
              display: "flex", 
              alignItems: "center", 
              fontWeight: 700,
              color: "white",
              fontSize: "32px"
            }}>
              <Icon icon="document" size={40} style={{ marginRight: "15px", color: "white" }} />
              Order Details
            </H1>
            <p style={{ 
              margin: "8px 0 0 55px", 
              fontSize: "18px", 
              opacity: 0.9,
              color: "white"
            }}>
              {orderInfo.order_number || `Order ID: ${orderId}`}
            </p>
            {orderInfo.order_date && (
              <p style={{ 
                margin: "4px 0 0 55px", 
                fontSize: "14px", 
                opacity: 0.8,
                color: "white"
              }}>
                Date: {orderInfo.order_date} | Status: {orderInfo.order_status}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "5px", color: "white" }}>
              Products Found
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "white" }}>
              {products.length}
            </div>
            {orderTotals.totalQuantity > 0 && (
              <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "5px", color: "white" }}>
                Total Qty: {orderTotals.totalQuantity} | Value: £{orderTotals.totalValue}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation Card */}
      <Card elevation={Elevation.ONE} style={{ marginBottom: "20px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
            <Button
              icon="arrow-left"
              onClick={() => navigate("/ohs/orders")}
              large
            >
              Back to Orders
            </Button>
            
            {orderInfo.view_link && (
              <Button
                icon="link"
                intent="none"
                onClick={() => window.open(orderInfo.view_link, "_blank")}
                large
              >
                View Original Order
              </Button>
            )}
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FormGroup label="Navigate to Order:" inline style={{ margin: 0 }}>
              <InputGroup
                placeholder="Enter Order ID"
                value={navigateOrderId}
                onChange={(e) => setNavigateOrderId(e.target.value)}
                style={{ width: "150px" }}
                onKeyPress={(e) => e.key === 'Enter' && handleNavigateToOrder()}
              />
            </FormGroup>
            <Button
              icon="arrow-right"
              intent="primary"
              onClick={handleNavigateToOrder}
              disabled={!navigateOrderId || navigateOrderId === orderId}
            >
              Go
            </Button>
          </div>
        </div>
      </Card>

      <Card elevation={Elevation.TWO} style={{ padding: "30px" }}>
        {/* Action Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "20px" 
        }}>
          <div>
            <H2 style={{ margin: "0 0 5px 0", fontWeight: 600 }}>Product Details</H2>
            {lastFetchInfo && (
              <div style={{ color: "#5c7080", fontSize: "14px" }}>
                {lastFetchInfo}
                {lastRefreshTime && (
                  <span style={{ marginLeft: "10px", fontStyle: "italic" }}>
                    (Last refresh: {lastRefreshTime})
                  </span>
                )}
              </div>
            )}
          </div>
          
          <ButtonGroup large style={{ gap: "16px" }}>
            <Button
              intent="primary"
              onClick={scrapeOrderDetails}
              loading={loading}
              icon="refresh"
              style={{ minWidth: "140px" }}
            >
              {loading ? "Scraping..." : "Scrape Details"}
            </Button>
            
            <Button
              intent="none"
              onClick={fetchOrderDetailsFromDb}
              loading={loading}
              icon="database"
              disabled={loading}
            >
              Reload from DB
            </Button>
            
            <Button
              intent="danger"
              onClick={deleteOrderDetails}
              loading={loading}
              icon="trash"
              disabled={loading || products.length === 0}
            >
              Clear Details
            </Button>
            
            <Button
              intent="danger"
              onClick={deleteOrder}
              loading={loading}
              icon="delete"
              disabled={loading}
              style={{ marginLeft: "10px" }}
            >
              Delete Order
            </Button>
          </ButtonGroup>
        </div>

        <Divider style={{ margin: "20px 0" }} />

        {/* Success/Error Messages */}
        {success && (
          <Callout intent="success" style={{ marginBottom: "20px" }} icon="tick">
            {success}
          </Callout>
        )}

        {error && (
          <Callout intent="danger" style={{ marginBottom: "20px" }} icon="error">
            <strong>Error:</strong> {error}
          </Callout>
        )}

        {/* Filters */}
        <Card elevation={Elevation.ONE} style={{ marginBottom: "25px", padding: "20px" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "auto 1fr auto auto auto auto", 
            gap: "15px", 
            alignItems: "center" 
          }}>
            {/* SKU Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <span style={{ fontWeight: 500, color: "#394b59" }}>Show:</span>
              <Checkbox
                checked={filters.showProductsWithSku}
                onChange={(e) => setFilters({...filters, showProductsWithSku: e.currentTarget.checked})}
                label="With SKU"
              />
              <Checkbox
                checked={filters.showProductsWithoutSku}
                onChange={(e) => setFilters({...filters, showProductsWithoutSku: e.currentTarget.checked})}
                label="Without SKU"
              />
            </div>

            {/* Search */}
            <InputGroup
              leftIcon="search"
              placeholder="Search products, SKU, size, filling..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              style={{ maxWidth: "2000px" }}
            />

            {/* Price Filters */}
            <InputGroup
              leftIcon="dollar"
              type="number"
              placeholder="Min price"
              value={filters.minPrice}
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              style={{ width: "120px" }}
            />
            
            <InputGroup
              leftIcon="dollar"
              type="number"
              placeholder="Max price"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              style={{ width: "120px" }}
            />

            <Button
              icon="cross"
              onClick={clearFilters}
              minimal
            >
              Clear
            </Button>
          </div>
        </Card>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Spinner size={40} />
            <div style={{ marginTop: "15px", color: "#5c7080", fontSize: "14px" }}>
              {loading ? "Processing order details..." : "Loading..."}
            </div>
          </div>
        )}

        {/* No Products */}
        {fetched && !loading && !error && filteredProducts.length === 0 && (
          <Callout intent="warning" icon="search">
            {products.length === 0 ? 
              `No product details found for order ${orderId}. Click 'Scrape Details' to fetch fresh data.` : 
              "No products match your filters."
            }
          </Callout>
        )}

        {/* Products Table */}
        {filteredProducts.length > 0 && !loading && !error && (
          <>
            {/* Table Info */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "20px" 
            }}>
              <div style={{ color: "#5c7080", fontSize: "14px" }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                {selectedProducts.size > 0 && (
                  <span style={{ marginLeft: "15px", fontWeight: 500, color: "#137cbd" }}>
                    ({selectedProducts.size} selected)
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#5c7080", fontSize: "14px" }}>Per page:</span>
                <ButtonGroup minimal>
                  {[10, 25, 50].map(size => (
                    <Button
                      key={size}
                      active={itemsPerPage === size}
                      onClick={() => {
                        setItemsPerPage(size);
                        setCurrentPage(1);
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </div>

            {/* Products Table */}
            <HTMLTable
              bordered
              striped
              interactive
              style={{ 
                width: "100%", 
                fontSize: "14px",
                marginBottom: "20px"
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f5f8fa" }}>
                  <th style={{ width: "50px", textAlign: "center" }}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    />
                  </th>
                  <th style={{ width: "60px", textAlign: "center", fontWeight: 600 }}>S.No</th>
                  <th style={{ fontWeight: 600 }}>Product Name</th>
                  <th style={{ fontWeight: 600 }}>SKU</th>
                  <th style={{ fontWeight: 600 }}>Size</th>
                  <th style={{ fontWeight: 600 }}>Filling</th>
                  <th style={{ fontWeight: 600 }}>Price</th>
                  <th style={{ fontWeight: 600 }}>Qty</th>
                  <th style={{ fontWeight: 600 }}>Subtotal</th>
                  <th style={{ width: "120px", fontWeight: 600, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product, index) => {
                  const productKey = `${product.sku}-${index}`;
                  const isSelected = selectedProducts.has(productKey);
                  const globalIndex = ((currentPage - 1) * itemsPerPage) + index + 1;
                  
                  return (
                    <tr 
                      key={productKey}
                      style={{
                        backgroundColor: isSelected ? "#e8f4f8" : undefined
                      }}
                    >
                      <td style={{ textAlign: "center" }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectProduct(productKey, e.currentTarget.checked)}
                        />
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 500, color: "#5c7080" }}>
                        {globalIndex}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {product.product_name}
                      </td>
                      <td style={{ fontFamily: "monospace", color: "#137cbd" }}>
                        {product.sku || 'N/A'}
                      </td>
                      <td>{product.size || 'N/A'}</td>
                      <td>{product.filling || 'N/A'}</td>
                      <td style={{ fontWeight: 600 }}>{product.price}</td>
                      <td style={{ textAlign: "center" }}>{product.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{product.subtotal}</td>
                      <td style={{ textAlign: "center" }}>
                        <Button
                          icon="upload"
                          intent="success"
                          small
                          onClick={() => sendProductToScraper(product, index)}
                          disabled={!product.sku || product.sku === "N/A" || loading}
                          title={
                            !product.sku || product.sku === "N/A" 
                              ? "Cannot scrape product without SKU" 
                              : "Send this product to scraper"
                          }
                        >
                          Scrape
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </HTMLTable>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                gap: "10px"
              }}>
                <Button
                  small
                  icon="chevron-left"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                
                <span style={{ color: "#5c7080", fontSize: "14px", margin: "0 10px" }}>
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  small
                  icon="chevron-right"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </div>
            )}
          </>
        )}

        {/* Selected Actions */}
        {selectedProducts.size > 0 && (
          <Card 
            elevation={Elevation.ONE} 
            style={{ 
              marginTop: "25px", 
              padding: "15px",
              borderLeft: "4px solid #f093fb",
              backgroundColor: "#f6f9fc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
              </span>
              <ButtonGroup style={{ gap: "16px" }}>
                <Button 
                  icon="export" 
                  intent="primary" 
                  small 
                  onClick={exportSelectedProducts}
                >
                  Export Selected
                </Button>
                <Button 
                  icon="upload" 
                  intent="success" 
                  small 
                  onClick={sendSelectedProductsToScraper}
                  disabled={loading}
                >
                  Send to Scraper
                </Button>
                <Button 
                  icon="trash" 
                  intent="danger" 
                  small 
                  onClick={deleteSelectedProducts}
                  disabled={loading}
                >
                  Delete Selected
                </Button>
                <Button 
                  icon="cross" 
                  small
                  onClick={() => setSelectedProducts(new Set())}
                >
                  Clear Selection
                </Button>
              </ButtonGroup>
            </div>
          </Card>
        )}

        {/* Export All Filtered Products */}
        {filteredProducts.length > 0 && (
          <Card 
            elevation={Elevation.ONE} 
            style={{ 
              marginTop: "25px", 
              padding: "15px",
              borderLeft: "4px solid #f093fb",
              backgroundColor: "#f6f9fc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                Export All Filtered Products
              </span>
              <ButtonGroup style={{ gap: "16px" }}>
                <Button icon="export" intent="primary" small onClick={exportAllFilteredProducts}>
                  Export All
                </Button>
              </ButtonGroup>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}