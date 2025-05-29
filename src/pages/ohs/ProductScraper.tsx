import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
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
  ButtonGroup,
  Tag,
  Intent,
  Icon,
  Divider,
  ProgressBar,
  FormGroup,
  Dialog,
  Classes,
  InputGroup,
  Checkbox,
  Menu,
  MenuItem,
  Popover,
  Alert,
} from "@blueprintjs/core";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;

interface ScrapingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  total_products: number;
  successful_scrapes: number;
  failed_scrapes: number;
  progress: number;
  created_at: string;
  completed_at?: string;
  results_file?: string;
  errors_file?: string;
  error?: string;
  current_product?: {
    index: number;
    sku: string;
    name: string;
    status: string;
  };
}

interface ProductToScrape {
  sku: string;
  partial_name: string;
  order_id?: string;
  order_number?: string;
}

export default function ProductScraper() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  
  // Manual input states
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualProducts, setManualProducts] = useState([{ sku: '', productName: '' }]);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobFilter, setJobFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pollingActive, setPollingActive] = useState(false);

  // Check if we're coming from Orders page
  const fromOrders = searchParams.get('from') === 'orders';

  // Auto-refresh running jobs every 2 seconds
  useEffect(() => {
    if (pollingActive) {
      const interval = setInterval(() => {
        fetchScrapingJobs();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [pollingActive]);

  // Check for running jobs and start polling if needed
  useEffect(() => {
    const hasRunningJobs = scrapingJobs.some(job => job.status === 'running' || job.status === 'pending');
    setPollingActive(hasRunningJobs);
  }, [scrapingJobs]);

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

  // Fetch scraping jobs on load
  useEffect(() => {
    fetchScrapingJobs();
  }, []);

  const fetchScrapingJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/scraping_jobs`);
      if (response.ok) {
        const data = await response.json();
        setScrapingJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Error fetching scraping jobs:", err);
    }
  };

  const hasRunningJob = scrapingJobs.some(job => job.status === 'running' || job.status === 'pending');

  const addManualProduct = () => {
    setManualProducts([...manualProducts, { sku: '', productName: '' }]);
  };

  const removeManualProduct = (index: number) => {
    if (manualProducts.length > 1) {
      setManualProducts(manualProducts.filter((_, i) => i !== index));
    }
  };

  const updateManualProduct = (index: number, field: 'sku' | 'productName', value: string) => {
    const updated = [...manualProducts];
    updated[index][field] = value;
    setManualProducts(updated);
  };

  const startManualScraping = async () => {
    // Validate input
    const validProducts = manualProducts.filter(p => p.sku.trim() && p.productName.trim());
    
    if (validProducts.length === 0) {
      setError("Please provide at least one product with SKU and Product Name");
      return;
    }

    if (hasRunningJob) {
      setError("Another scraping job is already running. Please wait for it to complete.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const products = validProducts.map(p => ({
        sku: p.sku.trim(),
        partial_name: p.productName.trim()
      }));

      const response = await fetch(`${API_URL}/start_product_scraping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          products: products
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(`Started scraping job for ${products.length} products!`);
        setManualProducts([{ sku: '', productName: '' }]);
        setShowManualInput(false);
        setTimeout(fetchScrapingJobs, 1000);
      } else {
        setError(data.error || "Failed to start scraping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const stopJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/stop_scraping_job/${jobId}`, {
        method: "POST"
      });
      
      if (response.ok) {
        setSuccess("Job stopped successfully");
        fetchScrapingJobs();
      } else {
        setError("Failed to stop job");
      }
    } catch (err) {
      setError("Error stopping job");
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/delete_scraping_job/${jobId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        setSuccess("Job deleted successfully");
        fetchScrapingJobs();
      } else {
        setError("Failed to delete job");
      }
    } catch (err) {
      setError("Error deleting job");
    }
  };

  const retryJob = async (jobId: string) => {
    if (hasRunningJob) {
      setError("Another scraping job is already running. Please wait for it to complete.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/retry_scraping_job/${jobId}`, {
        method: "POST"
      });
      
      if (response.ok) {
        setSuccess("Job restarted successfully");
        fetchScrapingJobs();
      } else {
        setError("Failed to retry job");
      }
    } catch (err) {
      setError("Error retrying job");
    }
  };

  const deleteSelectedJobs = async () => {
    if (selectedJobs.size === 0) return;

    setLoading(true);
    try {
      for (const jobId of selectedJobs) {
        await deleteJob(jobId);
      }
      setSelectedJobs(new Set());
      setDeleteDialogOpen(false);
      setSuccess(`Deleted ${selectedJobs.size} jobs`);
    } catch (err) {
      setError("Error deleting selected jobs");
    } finally {
      setLoading(false);
    }
  };

  const clearAllJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/clear_all_scraping_jobs`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        setSuccess("All jobs cleared successfully");
        fetchScrapingJobs();
      } else {
        setError("Failed to clear all jobs");
      }
    } catch (err) {
      setError("Error clearing all jobs");
    }
  };

  const downloadFile = async (filename: string, type: 'results' | 'errors') => {
    try {
      const response = await fetch(`${API_URL}/download_scraping_file/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to download ${type} file`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess(`Downloaded ${type} file: ${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to download ${type} file`);
    }
  };

  const getStatusIntent = (status: string): Intent => {
    switch (status) {
      case 'completed': return Intent.SUCCESS;
      case 'failed': return Intent.DANGER;
      case 'running': return Intent.PRIMARY;
      case 'stopped': return Intent.WARNING;
      default: return Intent.NONE;
    }
  };

  const handleSelectJob = (jobId: string, checked: boolean) => {
    const newSelected = new Set(selectedJobs);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
    } else {
      setSelectedJobs(new Set());
    }
  };

  // Filter jobs based on status and search term
  const filteredJobs = scrapingJobs.filter(job => {
    const matchesFilter = jobFilter === 'all' || job.status === jobFilter;
    const matchesSearch = searchTerm === '' || 
      job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.status.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const isAllSelected = filteredJobs.length > 0 && filteredJobs.every(job => selectedJobs.has(job.id));
  const isIndeterminate = filteredJobs.some(job => selectedJobs.has(job.id)) && !isAllSelected;

  // Running jobs for display
  const runningJobs = scrapingJobs.filter(job => job.status === 'running' || job.status === 'pending');

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
              <Icon icon="search-around" size={40} style={{ marginRight: "15px", color: "white" }} />
              Product Details Scraper
            </H1>
            <p style={{ 
              margin: "8px 0 0 55px", 
              fontSize: "18px", 
              opacity: 0.9,
              color: "white"
            }}>
              Advanced product information extraction from OnlineHomeShop.com
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "5px", color: "white" }}>
              Jobs Completed
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "white" }}>
              {scrapingJobs.filter(job => job.status === 'completed').length}
            </div>
          </div>
        </div>
      </Card>

      {/* Job Queue Alert */}
      {hasRunningJob && (
        <Alert
          isOpen={true}
          intent="primary"
          icon="info-sign"
          style={{ marginBottom: "20px" }}
        >
          <strong>Job Queue Active:</strong> Only one scraping job can run at a time. 
          New jobs will be queued until the current job completes.
        </Alert>
      )}

      {/* Running Jobs Progress */}
      {runningJobs.map(job => (
        <Card key={job.id} elevation={Elevation.TWO} style={{ marginBottom: "20px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <H4 style={{ margin: 0 }}>
              <Icon icon="cog" /> {job.status === 'pending' ? 'Queued Job' : 'Running Job'}: {job.id.substring(0, 8)}...
            </H4>
            <Button 
              icon="stop" 
              intent="danger" 
              small 
              onClick={() => stopJob(job.id)}
              disabled={job.status === 'pending'}
            >
              {job.status === 'pending' ? 'Queued' : 'Stop Job'}
            </Button>
          </div>
          
          {/* Current Product Info */}
          {job.current_product && (
            <Card elevation={Elevation.ONE} style={{ marginBottom: "15px", padding: "15px", backgroundColor: "#f8f9fa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Spinner size={16} />
                <div>
                  <strong>Currently Scraping:</strong> Product {job.current_product.index}/{job.total_products}
                </div>
              </div>
              <div style={{ marginTop: "8px", fontSize: "14px" }}>
                <div><strong>SKU:</strong> {job.current_product.sku}</div>
                <div><strong>Product:</strong> {job.current_product.name}</div>
                <div><strong>Status:</strong> <Tag intent="primary">{job.current_product.status}</Tag></div>
              </div>
            </Card>
          )}
          
          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span>Progress: {job.successful_scrapes + job.failed_scrapes} / {job.total_products}</span>
              <span>{job.progress.toFixed(1)}%</span>
            </div>
            <ProgressBar 
              value={job.progress / 100} 
              intent={Intent.PRIMARY}
              stripes={job.status === 'running'}
            />
          </div>
          
          <div style={{ display: "flex", gap: "20px", fontSize: "14px", alignItems: "center" }}>
            <span style={{ color: "#0f9960" }}>✅ Success: {job.successful_scrapes}</span>
            <span style={{ color: "#d9822b" }}>❌ Failed: {job.failed_scrapes}</span>
            <span>Status: <Tag intent={getStatusIntent(job.status)}>{job.status}</Tag></span>
            
            {/* Real-time Download Buttons */}
            {(job.successful_scrapes > 0 || job.failed_scrapes > 0) && (
              <div style={{ marginLeft: "auto", display: "flex", gap: "5px" }}>
                {job.successful_scrapes > 0 && (
                  <Button
                    small
                    icon="download"
                    intent="success"
                    onClick={() => downloadFile(`temp_success_${job.id.substring(0, 8)}.csv`, 'results')}
                  >
                    Download Success ({job.successful_scrapes})
                  </Button>
                )}
                {job.failed_scrapes > 0 && (
                  <Button
                    small
                    icon="warning-sign"
                    intent="warning"
                    onClick={() => downloadFile(`temp_failed_${job.id.substring(0, 8)}.csv`, 'errors')}
                  >
                    Download Failed ({job.failed_scrapes})
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}

      <Card elevation={Elevation.TWO} style={{ padding: "30px" }}>
        {/* Action Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "20px" 
        }}>
          <div>
            <H2 style={{ margin: "0 0 5px 0", fontWeight: 600 }}>Scraping Job Management</H2>
            <div style={{ color: "#5c7080", fontSize: "14px" }}>
              {fromOrders ? "Jobs from selected orders will appear here automatically" : "Manage your product scraping jobs"}
            </div>
          </div>
          
          <ButtonGroup large>
            {!fromOrders && (
              <Button
                intent="primary"
                onClick={() => setShowManualInput(!showManualInput)}
                icon="add"
                disabled={hasRunningJob}
              >
                Manual Scraping
              </Button>
            )}
            <Button
              intent="warning"
              onClick={fetchScrapingJobs}
              icon="refresh"
              disabled={loading}
            >
              Refresh
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

        {/* Manual Input Section */}
        {showManualInput && !fromOrders && (
          <Card elevation={Elevation.ONE} style={{ marginBottom: "25px", padding: "20px" }}>
            <H4>Manual Product Input</H4>
            <p style={{ color: "#5c7080", marginBottom: "15px" }}>
              Add products to scrape by providing SKU and Product Name. You can add multiple products.
            </p>
            
            {manualProducts.map((product, index) => (
              <div key={index} style={{ 
                display: "flex", 
                gap: "10px", 
                marginBottom: "10px", 
                alignItems: "flex-end" 
              }}>
                <FormGroup label={index === 0 ? "SKU" : ""} style={{ flex: 1 }}>
                  <InputGroup
                    placeholder="e.g., SACCFLFCL45"
                    value={product.sku}
                    onChange={(e) => updateManualProduct(index, 'sku', e.target.value)}
                  />
                </FormGroup>
                
                <FormGroup label={index === 0 ? "Product Name" : ""} style={{ flex: 2 }}>
                  <InputGroup
                    placeholder="e.g., Sienna Fluffy Cushion Covers - Charcoal"
                    value={product.productName}
                    onChange={(e) => updateManualProduct(index, 'productName', e.target.value)}
                  />
                </FormGroup>
                
                <div style={{ display: "flex", gap: "5px" }}>
                  {index === manualProducts.length - 1 && (
                    <Button
                      icon="plus"
                      minimal
                      onClick={addManualProduct}
                      title="Add another product"
                    />
                  )}
                  {manualProducts.length > 1 && (
                    <Button
                      icon="cross"
                      minimal
                      intent="danger"
                      onClick={() => removeManualProduct(index)}
                      title="Remove this product"
                    />
                  )}
                </div>
              </div>
            ))}
            
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
              <Button
                intent="primary"
                onClick={startManualScraping}
                loading={loading}
                icon="play"
                disabled={loading || hasRunningJob}
              >
                {loading ? "Starting Scraping..." : `Start Scraping (${manualProducts.filter(p => p.sku.trim() && p.productName.trim()).length} products)`}
              </Button>
              <Button
                onClick={() => {
                  setShowManualInput(false);
                  setManualProducts([{ sku: '', productName: '' }]);
                }}
                icon="cross"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Jobs Filter and Search */}
        <Card elevation={Elevation.ONE} style={{ marginBottom: "25px", padding: "20px" }}>
          <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 500 }}>Filter:</span>
              <ButtonGroup>
                {(['all', 'running', 'completed', 'failed'] as const).map(status => (
                  <Button
                    key={status}
                    active={jobFilter === status}
                    onClick={() => setJobFilter(status)}
                    small
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            
            <InputGroup
              leftIcon="search"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "200px" }}
            />
            
            {pollingActive && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#137cbd" }}>
                <Spinner size={16} />
                <span style={{ fontSize: "14px" }}>Live updates active</span>
              </div>
            )}
          </div>
        </Card>

        {/* Bulk Actions */}
        {selectedJobs.size > 0 && (
          <Card 
            elevation={Elevation.ONE} 
            style={{ 
              marginBottom: "25px", 
              padding: "15px",
              borderLeft: "4px solid #137cbd",
              backgroundColor: "#f6f9fc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
              </span>
              <ButtonGroup>
                <Button 
                  icon="trash" 
                  intent="danger"
                  small
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Selected
                </Button>
                <Button 
                  icon="cross" 
                  small
                  onClick={() => setSelectedJobs(new Set())}
                >
                  Clear Selection
                </Button>
              </ButtonGroup>
            </div>
          </Card>
        )}

        {/* Jobs Table */}
        <div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "15px" 
          }}>
            <H2 style={{ margin: 0, fontWeight: 600 }}>
              Scraping Jobs ({filteredJobs.length})
            </H2>
            
            {scrapingJobs.length > 0 && (
              <Popover
                content={
                  <Menu>
                    <MenuItem icon="refresh" text="Refresh Jobs" onClick={fetchScrapingJobs} />
                    <MenuItem 
                      icon="trash" 
                      text="Clear All Jobs" 
                      intent="danger" 
                      onClick={clearAllJobs}
                    />
                  </Menu>
                }
              >
                <Button icon="more" minimal />
              </Popover>
            )}
          </div>
          
          {filteredJobs.length === 0 ? (
            <Callout intent="primary" icon="info-sign">
              {scrapingJobs.length === 0 
                ? (fromOrders 
                  ? "No scraping jobs yet. Select orders and send them to the Product Scraper to start!" 
                  : "No scraping jobs found. Create your first scraping job!")
                : "No jobs match your current filters."
              }
            </Callout>
          ) : (
            <HTMLTable bordered striped style={{ width: "100%", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f8fa" }}>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    />
                  </th>
                  <th>Job ID</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Progress</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr 
                    key={job.id}
                    style={{
                      backgroundColor: selectedJobs.has(job.id) ? "#e8f4f8" : undefined
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <Checkbox
                        checked={selectedJobs.has(job.id)}
                        onChange={(e) => handleSelectJob(job.id, e.currentTarget.checked)}
                      />
                    </td>
                    <td style={{ fontFamily: "monospace" }}>{job.id.substring(0, 8)}...</td>
                    <td>
                      <Tag intent={getStatusIntent(job.status)}>
                        {job.status}
                      </Tag>
                      {job.error && (
                        <div style={{ fontSize: "11px", color: "#d9822b", marginTop: "2px" }}>
                          {job.error.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td>{job.total_products}</td>
                    <td style={{ color: "#0f9960" }}>{job.successful_scrapes}</td>
                    <td style={{ color: "#d9822b" }}>{job.failed_scrapes}</td>
                    <td>
                      <div style={{ width: "80px" }}>
                        <ProgressBar 
                          value={job.progress / 100} 
                          intent={getStatusIntent(job.status)}
                        />
                        <div style={{ fontSize: "10px", textAlign: "center" }}>
                          {job.progress.toFixed(0)}%
                        </div>
                      </div>
                    </td>
                    <td>{new Date(job.created_at).toLocaleDateString()}</td>
                    <td>
                      <ButtonGroup minimal>
                        {(job.status === 'running' || job.status === 'pending') && (
                          <Button
                            small
                            icon="stop"
                            intent="danger"
                            onClick={() => stopJob(job.id)}
                            title="Stop Job"
                          />
                        )}
                        
                        {(job.status === 'failed' || job.status === 'stopped') && (
                          <Button
                            small
                            icon="refresh"
                            intent="warning"
                            onClick={() => retryJob(job.id)}
                            title="Retry Job"
                            disabled={hasRunningJob}
                          />
                        )}
                        
                        {job.results_file && (
                          <Button
                            small
                            icon="download"
                            intent="success"
                            onClick={() => downloadFile(job.results_file!, 'results')}
                            title="Download Results"
                          />
                        )}
                        
                        {job.errors_file && (
                          <Button
                            small
                            icon="warning-sign"
                            intent="warning"
                            onClick={() => downloadFile(job.errors_file!, 'errors')}
                            title="Download Errors"
                          />
                        )}
                        
                        <Button
                          small
                          icon="trash"
                          intent="danger"
                          onClick={() => deleteJob(job.id)}
                          title="Delete Job"
                        />
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Selected Jobs"
        icon="trash"
      >
        <div className={Classes.DIALOG_BODY}>
          <p>
            Are you sure you want to delete {selectedJobs.size} selected job{selectedJobs.size !== 1 ? 's' : ''}? 
            This action cannot be undone.
          </p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              intent="danger" 
              onClick={deleteSelectedJobs}
              loading={loading}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 