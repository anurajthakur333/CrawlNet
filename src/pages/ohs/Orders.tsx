import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Elevation,
  H2,
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
  H4,
  Divider,
} from "@blueprintjs/core";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;

interface Order {
  order_number: string;
  date: string;
  total: string;
  status: string;
  view_link: string;
  order_id?: string;
}

interface Stats {
  total: number;
  completed: number;
  canceled: number;
  db_count: number;
}

interface Filters {
  showCompleted: boolean;
  showCanceled: boolean;
  orderNumber: string;
  dateFrom: string;
  dateTo: string;
}

export default function OhsOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, canceled: 0, db_count: 0 });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastFetchInfo, setLastFetchInfo] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    showCompleted: true,
    showCanceled: true,
    orderNumber: "",
    dateFrom: "",
    dateTo: "",
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

  // Fetch orders from MongoDB
  const fetchOrdersFromDb = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedOrders(new Set());
    try {
      const response = await fetch(`${API_URL}/orders_db`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setStats(data.stats || { total: 0, completed: 0, canceled: 0, db_count: 0 });
        setFetched(true);
        setCurrentPage(1);
        setLastFetchInfo(`Loaded ${data.orders.length} orders from database`);
      } else {
        setError("Invalid data structure received from API");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Trigger a fresh scrape and then reload from DB
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedOrders(new Set());
    try {
      // Trigger the scrape (which also updates the DB)
      const response = await fetch(`${API_URL}/orders`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setStats(data.stats || { total: 0, completed: 0, canceled: 0, db_count: 0 });
        setFetched(true);
        setCurrentPage(1);
        
        const scrapedCount = data.scraped_count || 0;
        const dbCount = data.count || 0;
        const detailsScraped = data.order_details_scraped || 0;
        const detailsFailed = data.order_details_failed || 0;
        
        setLastFetchInfo(`Scraped ${scrapedCount} orders, ${dbCount} total in database. Order details: ${detailsScraped} successful, ${detailsFailed} failed`);
        
        let successMessage = `Successfully fetched and saved ${scrapedCount} orders to database!`;
        if (detailsScraped > 0) {
          successMessage += ` Also scraped details for ${detailsScraped} orders.`;
        }
        if (detailsFailed > 0) {
          successMessage += ` Note: ${detailsFailed} order details failed to scrape (likely canceled orders).`;
        }
        
        setSuccess(successMessage);
      } else if (data.error) {
        setError(`Scraping error: ${data.error}`);
      } else {
        setError("Invalid data structure received from API");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Delete all orders from database
  const deleteAllOrders = async () => {
    if (!window.confirm("Are you sure you want to delete ALL orders from the database? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/orders_db`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrders([]);
        setStats({ total: 0, completed: 0, canceled: 0, db_count: 0 });
        setSelectedOrders(new Set());
        setCurrentPage(1);
        
        const ordersDeleted = data.orders_deleted || 0;
        const orderDetailsDeleted = data.order_details_deleted || 0;
        
        setLastFetchInfo(`Deleted ${ordersDeleted} orders and ${orderDetailsDeleted} order details from database`);
        setSuccess(`Successfully deleted ${ordersDeleted} orders and ${orderDetailsDeleted} order details from database!`);
      } else {
        setError(`Delete error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setDeleting(false);
    }
  };

  // Export order details CSV for selected orders
  const exportSelectedOrderDetails = async () => {
    if (selectedOrders.size === 0) {
      setError("No orders selected for export");
      return;
    }

    // Get order IDs from selected orders
    const selectedOrdersData = orders.filter(order => selectedOrders.has(order.order_number));
    const orderIds = selectedOrdersData.map(order => order.order_id).filter(id => id);
    
    if (orderIds.length === 0) {
      setError("Selected orders do not have order IDs for details export");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Fetch order details for each selected order from database
      const allOrderDetails = [];
      let successCount = 0;
      let failCount = 0;

      for (const orderId of orderIds) {
        try {
          const response = await fetch(`${API_URL}/order_details_db/${orderId}`);
          const data = await response.json();
          
          if (data.success && data.found) {
            data.products.forEach((product: any, index: number) => {
              allOrderDetails.push({
                sno: allOrderDetails.length + 1,
                order_number: data.order_info?.order_number || 'N/A',
                order_id: orderId,
                order_date: data.order_info?.order_date || 'N/A',
                order_status: data.order_info?.order_status || 'N/A',
                product_name: product.product_name || 'N/A',
                sku: product.sku || 'N/A',
                size: product.size || 'N/A',
                filling: product.filling || 'N/A',
                price: product.price || 'N/A',
                quantity: product.quantity || 'N/A',
                subtotal: product.subtotal || 'N/A'
              });
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      if (allOrderDetails.length === 0) {
        setError("No order details found for selected orders. Please scrape order details first.");
        return;
      }

      // Generate CSV
      const headers = [
        "S.No",
        "Order Number",
        "Order ID", 
        "Order Date",
        "Order Status",
        "Product Name",
        "SKU",
        "Size",
        "Filling",
        "Price",
        "Quantity",
        "Subtotal"
      ];
      
      const csvRows = allOrderDetails.map((detail) => [
        `"${detail.sno}"`,
        `"${detail.order_number}"`,
        `"${detail.order_id}"`,
        `"${detail.order_date}"`,
        `"${detail.order_status}"`,
        `"${detail.product_name}"`,
        `"${detail.sku}"`,
        `"${detail.size}"`,
        `"${detail.filling}"`,
        `"${detail.price}"`,
        `"${detail.quantity}"`,
        `"${detail.subtotal}"`
      ]);
      
      const csvContent = [
        headers.join(","),
        ...csvRows.map(row => row.join(","))
      ].join("\n");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `ohs_order_details_${timestamp}.csv`;
      
      // Download CSV
      downloadCSV(csvContent, filename);
      
      setSuccess(`Successfully exported ${allOrderDetails.length} order details from ${successCount} orders to ${filename}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const sendToProductScraper = async () => {
    if (selectedOrders.size === 0) {
      setError("No orders selected for product scraping");
      return;
    }

    // Get order IDs from selected orders
    const selectedOrdersData = orders.filter(order => selectedOrders.has(order.order_number));
    const orderIds = selectedOrdersData.map(order => order.order_id).filter(id => id);
    
    if (orderIds.length === 0) {
      setError("Selected orders do not have order IDs for product scraping");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate products from orders first
      const response = await fetch(`${API_URL}/generate_products_from_orders`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate products from orders");
      }

      // Filter products for only selected orders
      const selectedProducts = data.products.filter((product: any) => 
        orderIds.includes(product.order_id)
      );

      if (selectedProducts.length === 0) {
        setError("No products found for selected orders. Please scrape order details first.");
        return;
      }

      // Start product scraping job
      const scrapingResponse = await fetch(`${API_URL}/start_product_scraping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          products: selectedProducts
        })
      });

      const scrapingData = await scrapingResponse.json();

      if (scrapingData.success) {
        setSuccess(`Started product scraping job for ${selectedProducts.length} products from ${selectedOrders.size} orders! Check Product Scraper page for progress.`);
        // Clear selection
        setSelectedOrders(new Set());
      } else {
        setError(scrapingData.error || "Failed to start product scraping");
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Initial load from DB
  useEffect(() => {
    fetchOrdersFromDb();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = order.status.toLowerCase();
      const statusFilter = 
        (filters.showCompleted && status === "complete") ||
        (filters.showCanceled && status === "canceled");

      if (!statusFilter) return false;

      if (filters.orderNumber && 
          !order.order_number.toLowerCase().includes(filters.orderNumber.toLowerCase()) &&
          !(order.order_id && order.order_id.toLowerCase().includes(filters.orderNumber.toLowerCase()))) {
        return false;
      }

      if (filters.dateFrom || filters.dateTo) {
        // Parse date in DD/MM/YYYY format
        const dateParts = order.date.split('/');
        if (dateParts.length === 3) {
          const orderDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
          
          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            if (orderDate < fromDate) return false;
          }
          
          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (orderDate > toDate) return false;
          }
        }
      }

      return true;
    });
  }, [orders, filters]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(paginatedOrders.map(order => order.order_number)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderNumber: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderNumber);
    } else {
      newSelected.delete(orderNumber);
    }
    setSelectedOrders(newSelected);
  };

  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every(order => selectedOrders.has(order.order_number));
  const isIndeterminate = paginatedOrders.some(order => selectedOrders.has(order.order_number)) && !isAllSelected;

  const getStatusIntent = (status: string): Intent => {
    return status.toLowerCase() === "complete" ? Intent.SUCCESS : Intent.DANGER;
  };

  const clearFilters = () => {
    setFilters({
      showCompleted: true,
      showCanceled: true,
      orderNumber: "",
      dateFrom: "",
      dateTo: "",
    });
    setCurrentPage(1);
  };

  // CSV Export functionality
  const convertToCSV = (orders: Order[]) => {
    const headers = [
      "S.No",
      "Order Number", 
      "Order ID", 
      "Date", 
      "Total", 
      "Status", 
      "View Link"
    ];
    
    const csvRows = orders.map((order, index) => [
      `"${index + 1}"`,
      `"${order.order_number}"`,
      `"${order.order_id || 'N/A'}"`,
      `"${order.date}"`,
      `"${order.total}"`,
      `"${order.status}"`,
      `"${order.view_link}"`
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

  const exportSelectedOrders = () => {
    // Get the selected orders
    const selectedOrdersData = orders.filter(order => 
      selectedOrders.has(order.order_number)
    );
    
    if (selectedOrdersData.length === 0) {
      setError("No orders selected for export");
      return;
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ohs_selected_orders_${timestamp}.csv`;
    
    // Convert to CSV and download
    const csvContent = convertToCSV(selectedOrdersData);
    downloadCSV(csvContent, filename);
    
    // Show success message
    setSuccess(`Successfully exported ${selectedOrdersData.length} selected orders to ${filename}`);
  };

  const exportAllFilteredOrders = () => {
    if (filteredOrders.length === 0) {
      setError("No orders to export");
      return;
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ohs_all_orders_${timestamp}.csv`;
    
    // Convert to CSV and download
    const csvContent = convertToCSV(filteredOrders);
    downloadCSV(csvContent, filename);
    
    // Show success message
    setSuccess(`Successfully exported ${filteredOrders.length} orders to ${filename}`);
  };

  return (
    <div style={{ 
      marginTop: "80px",
      width: "100%",
      paddingLeft: "20px",
      paddingRight: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Header Card */}
      <Card elevation={Elevation.THREE} style={{ 
        padding: "30px", 
        marginBottom: "20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <H2 style={{ 
              margin: 0, 
              display: "flex", 
              alignItems: "center", 
              fontWeight: 700,
              color: "white",
              fontSize: "28px"
            }}>
              <Icon icon="globe-network" size={32} style={{ marginRight: "15px", color: "white" }} />
              OHS Orders Scraper
            </H2>
            <p style={{ 
              margin: "8px 0 0 47px", 
              fontSize: "16px", 
              opacity: 0.9,
              color: "white"
            }}>
              Automated order tracking for OnlineHomeShop.com
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "5px", color: "white" }}>
              Database Status
            </div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>
              {stats.db_count} Orders
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "20px", 
        marginBottom: "25px" 
      }}>
        <Card elevation={Elevation.ONE} style={{ padding: "20px", textAlign: "center" }}>
          <Icon icon="database" size={24} style={{ color: "#137cbd", marginBottom: "8px" }} />
          <H4 style={{ margin: "0 0 5px 0", color: "#137cbd" }}>{stats.total}</H4>
          <div style={{ color: "#5c7080", fontSize: "14px" }}>Total Orders</div>
        </Card>
        
        <Card elevation={Elevation.ONE} style={{ padding: "20px", textAlign: "center" }}>
          <Icon icon="tick-circle" size={24} style={{ color: "#0f9960", marginBottom: "8px" }} />
          <H4 style={{ margin: "0 0 5px 0", color: "#0f9960" }}>{stats.completed}</H4>
          <div style={{ color: "#5c7080", fontSize: "14px" }}>Completed</div>
        </Card>
        
        <Card elevation={Elevation.ONE} style={{ padding: "20px", textAlign: "center" }}>
          <Icon icon="cross-circle" size={24} style={{ color: "#d9822b", marginBottom: "8px" }} />
          <H4 style={{ margin: "0 0 5px 0", color: "#d9822b" }}>{stats.canceled}</H4>
          <div style={{ color: "#5c7080", fontSize: "14px" }}>Canceled</div>
        </Card>
        
        <Card elevation={Elevation.ONE} style={{ padding: "20px", textAlign: "center" }}>
          <Icon icon="filter" size={24} style={{ color: "#7961db", marginBottom: "8px" }} />
          <H4 style={{ margin: "0 0 5px 0", color: "#7961db" }}>{filteredOrders.length}</H4>
          <div style={{ color: "#5c7080", fontSize: "14px" }}>Filtered</div>
        </Card>
      </div>

      <Card elevation={Elevation.TWO} style={{ padding: "30px" }}>
        {/* Action Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "20px" 
        }}>
          <div>
            <H2 style={{ margin: "0 0 5px 0", fontWeight: 600 }}>Order Management</H2>
            {lastFetchInfo && (
              <div style={{ color: "#5c7080", fontSize: "14px" }}>
                {lastFetchInfo}
              </div>
            )}
          </div>
          
          <ButtonGroup large style={{ gap: "16px" }}>
            <Button
              intent="primary"
              onClick={fetchOrders}
              loading={loading}
              icon="refresh"
              style={{ minWidth: "140px" }}
            >
              {loading ? "Scraping..." : "Fetch New Orders"}
            </Button>
            
            <Button
              intent="none"
              onClick={fetchOrdersFromDb}
              loading={loading}
              icon="database"
              disabled={loading || deleting}
            >
              Reload from DB
            </Button>
            
            <Button
              intent="danger"
              onClick={deleteAllOrders}
              loading={deleting}
              icon="trash"
              disabled={loading || deleting || orders.length === 0}
            >
              {deleting ? "Deleting..." : "Clear Database"}
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
            display: "flex",
            flexDirection: "column",
            gap: "15px"
          }}>
            {/* First Row: Status Filters and Search */}
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap",
              gap: "15px", 
              alignItems: "center" 
            }}>
              {/* Status Filters */}
              <div style={{ display: "flex", alignItems: "center", gap: "15px", minWidth: "fit-content" }}>
                <span style={{ fontWeight: 500, color: "#394b59" }}>Status:</span>
                <Checkbox
                  checked={filters.showCompleted}
                  onChange={(e) => setFilters({...filters, showCompleted: e.currentTarget.checked})}
                  label="Complete"
                />
                <Checkbox
                  checked={filters.showCanceled}
                  onChange={(e) => setFilters({...filters, showCanceled: e.currentTarget.checked})}
                  label="Canceled"
                />
              </div>

              {/* Search */}
              <InputGroup
                leftIcon="search"
                placeholder="Search order number or ID..."
                value={filters.orderNumber}
                onChange={(e) => setFilters({...filters, orderNumber: e.target.value})}
                style={{ flex: 1, minWidth: "250px" }}
              />
            </div>
            
            {/* Second Row: Date Filters and Clear Button */}
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap",
              gap: "15px", 
              alignItems: "center" 
            }}>
              {/* Date Filters */}
              <InputGroup
                leftIcon="calendar"
                type="date"
                placeholder="From date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                style={{ width: "150px" }}
              />
              
              <InputGroup
                leftIcon="calendar"
                type="date"
                placeholder="To date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                style={{ width: "150px" }}
              />

              <Button
                icon="cross"
                onClick={clearFilters}
                minimal
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Spinner size={40} />
            <div style={{ marginTop: "15px", color: "#5c7080", fontSize: "14px" }}>
              {loading ? "Fetching orders..." : "Loading..."}
            </div>
          </div>
        )}

        {/* No Orders */}
        {fetched && !loading && !error && filteredOrders.length === 0 && (
          <Callout intent="warning" icon="search">
            {orders.length === 0 ? "No orders found in database. Click 'Fetch New Orders' to scrape fresh data." : "No orders match your filters."}
          </Callout>
        )}

        {/* Table */}
        {filteredOrders.length > 0 && !loading && !error && (
          <>
            {/* Table Info */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "20px" 
            }}>
              <div style={{ color: "#5c7080", fontSize: "14px" }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                {selectedOrders.size > 0 && (
                  <span style={{ marginLeft: "15px", fontWeight: 500, color: "#137cbd" }}>
                    ({selectedOrders.size} selected)
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#5c7080", fontSize: "14px" }}>Per page:</span>
                <ButtonGroup minimal >
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

            {/* Orders Table */}
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
                  <th style={{ fontWeight: 600 }}>Order #</th>
                  <th style={{ fontWeight: 600 }}>Order ID</th>
                  <th style={{ fontWeight: 600 }}>Date</th>
                  <th style={{ fontWeight: 600 }}>Total</th>
                  <th style={{ fontWeight: 600 }}>Status</th>
                  <th style={{ width: "140px", textAlign: "center", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr 
                    key={order.order_number}
                    style={{
                      backgroundColor: selectedOrders.has(order.order_number) ? "#e8f4f8" : undefined
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <Checkbox
                        checked={selectedOrders.has(order.order_number)}
                        onChange={(e) => handleSelectOrder(order.order_number, e.currentTarget.checked)}
                      />
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: "monospace" }}>
                      {order.order_number}
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: "monospace", color: "#137cbd" }}>
                      {order.order_id || 'N/A'}
                    </td>
                    <td>{order.date}</td>
                    <td style={{ fontWeight: 600 }}>{order.total}</td>
                    <td>
                      <Tag
                        intent={getStatusIntent(order.status)}
                        minimal
                      >
                        {order.status}
                      </Tag>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <ButtonGroup minimal>
                        <Button
                          small
                          icon="document-open"
                          intent="primary"
                          onClick={() => {
                            if (order.order_id) {
                              navigate(`/ohs/order-details/${order.order_id}`);
                            } else {
                              window.open(order.view_link, "_blank");
                            }
                          }}
                        >
                          {order.order_id ? "Details" : "View"}
                        </Button>
                        
                        <Button
                          small
                          icon="link"
                          intent="none"
                          onClick={() => window.open(order.view_link, "_blank")}
                          title="View original order on OnlineHomeShop"
                        >
                          View Order
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
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
        {selectedOrders.size > 0 && (
          <Card 
            elevation={Elevation.ONE} 
            style={{ 
              marginTop: "25px", 
              padding: "15px",
              borderLeft: "4px solid #137cbd",
              backgroundColor: "#f6f9fc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                </span>
                {(() => {
                  const selectedOrdersData = orders.filter(order => selectedOrders.has(order.order_number));
                  const totalValue = selectedOrdersData.reduce((sum, order) => {
                    const value = parseFloat(order.total.replace(/[£$€,]/g, '')) || 0;
                    return sum + value;
                  }, 0);
                  const completeCount = selectedOrdersData.filter(order => order.status.toLowerCase() === 'complete').length;
                  const canceledCount = selectedOrdersData.filter(order => order.status.toLowerCase() === 'canceled').length;
                  
                  return (
                    <div style={{ fontSize: "12px", color: "#5c7080", marginTop: "5px" }}>
                      Total Value: £{totalValue.toFixed(2)} | Complete: {completeCount} | Canceled: {canceledCount}
                    </div>
                  );
                })()}
              </div>
              <ButtonGroup style={{ gap: "16px" }}>
                <Button icon="export" intent="primary" small onClick={exportSelectedOrders}>
                  Export Orders
                </Button>
                <Button 
                  icon="document"
                  intent="success"
                  small
                  onClick={exportSelectedOrderDetails}
                  disabled={loading}
                >
                  Export Details
                </Button>
                <Button 
                  icon="search-around"
                  intent="warning"
                  small
                  onClick={sendToProductScraper}
                  disabled={loading}
                >
                  Send to Product Scraper
                </Button>
                <Button 
                  icon="cross" 
                  small
                  onClick={() => setSelectedOrders(new Set())}
                >
                  Clear
                </Button>
              </ButtonGroup>
            </div>
          </Card>
        )}

        {/* Export All Filtered Orders */}
        {filteredOrders.length > 0 && (
          <Card 
            elevation={Elevation.ONE} 
            style={{ 
              marginTop: "25px", 
              padding: "15px",
              borderLeft: "4px solid #137cbd",
              backgroundColor: "#f6f9fc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                Export All Filtered Orders
              </span>
              <ButtonGroup style={{ gap: "16px" }}>
                <Button icon="export" intent="primary" small onClick={exportAllFilteredOrders}>
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