import { useState, useMemo, useEffect } from "react";
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

interface Order {
  order_number: string;
  date: string;
  total: string;
  status: string;
  view_link: string;
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
      const response = await fetch("http://localhost:8000/orders_db");
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
      const response = await fetch("http://localhost:8000/orders");
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
        setLastFetchInfo(`Scraped ${scrapedCount} orders, ${dbCount} total in database`);
        setSuccess(`Successfully fetched and saved ${scrapedCount} orders to database!`);
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
      const response = await fetch("http://localhost:8000/orders_db", {
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
        setLastFetchInfo(`Deleted ${data.deleted_count} orders from database`);
        setSuccess(`Successfully deleted ${data.deleted_count} orders from database!`);
      } else {
        setError(`Delete error: ${data.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setDeleting(false);
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

      if (filters.orderNumber && !order.order_number.toLowerCase().includes(filters.orderNumber.toLowerCase())) {
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
            display: "grid", 
            gridTemplateColumns: "auto 1fr auto auto auto", 
            gap: "15px", 
            alignItems: "center" 
          }}>
            {/* Status Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
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
              placeholder="Search order number..."
              value={filters.orderNumber}
              onChange={(e) => setFilters({...filters, orderNumber: e.target.value})}
              style={{ maxWidth: "200px" }}
            />

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
                  <th style={{ fontWeight: 600 }}>Date</th>
                  <th style={{ fontWeight: 600 }}>Total</th>
                  <th style={{ fontWeight: 600 }}>Status</th>
                  <th style={{ width: "100px", textAlign: "center", fontWeight: 600 }}>Action</th>
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
                      <Button
                        small
                        icon="document-open"
                        intent="primary"
                        onClick={() => window.open(order.view_link, "_blank")}
                      >
                        View
                      </Button>
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
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </span>
              <ButtonGroup style={{ gap: "16px" }}>
                <Button icon="export" intent="primary" small>
                  Export
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
      </Card>
    </div>
  );
}