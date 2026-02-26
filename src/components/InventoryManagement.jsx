import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocalShipping as SupplierIcon,
  ShoppingCart as PurchaseOrderIcon,
  Category as ItemsIcon,
  SwapHoriz as StockIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  suppliers: "/api/suppliers",
  purchaseOrders: "/api/purchase-orders",
  inventory: "/api/inventory",
  inventoryTransactions: "/api/inventory-transactions",
};

const getToken = () => localStorage.getItem("token");

async function fetchJson(url, { method = "GET", body, token } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

const PO_STATUS_OPTIONS = ["draft", "ordered", "received", "cancelled"];

export default function InventoryManagement() {
  const theme = useTheme();
  const isMobileQuery = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    setIsMobile(isMobileQuery);
  }, [isMobileQuery]);
  const token = getToken();

  const [tab, setTab] = useState(0);

  // Suppliers
  const suppReqId = useRef(0);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersPage, setSuppliersPage] = useState(0);
  const [suppliersRowsPerPage, setSuppliersRowsPerPage] = useState(10);
  const [suppliersTotal, setSuppliersTotal] = useState(0);
  const [suppliersSearch, setSuppliersSearch] = useState("");
  const [supplierDialog, setSupplierDialog] = useState({ open: false, mode: "create", id: null });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [supplierView, setSupplierView] = useState({ open: false, data: null });
  const [supplierSaving, setSupplierSaving] = useState(false);

  // Purchase orders
  const poReqId = useRef(0);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrdersLoading, setPurchaseOrdersLoading] = useState(false);
  const [purchaseOrdersPage, setPurchaseOrdersPage] = useState(0);
  const [purchaseOrdersRowsPerPage, setPurchaseOrdersRowsPerPage] = useState(10);
  const [purchaseOrdersTotal, setPurchaseOrdersTotal] = useState(0);
  const [poStatusFilter, setPoStatusFilter] = useState("");
  const [poDialog, setPoDialog] = useState({ open: false, mode: "create", id: null });
  const [poForm, setPoForm] = useState({ supplier_id: "", order_date: new Date().toISOString().slice(0, 10), status: "draft", items: [] });
  const [poView, setPoView] = useState({ open: false, data: null });
  const [poSaving, setPoSaving] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [inventoryItemOptions, setInventoryItemOptions] = useState([]);
  const [poAddLineOpen, setPoAddLineOpen] = useState(false);
  const [poAddLineForm, setPoAddLineForm] = useState({ inventory_item_id: "", quantity_ordered: "1", unit_price: "" });
  const [poAddLineSaving, setPoAddLineSaving] = useState(false);
  const [poEditLineOpen, setPoEditLineOpen] = useState(false);
  const [poEditLineForm, setPoEditLineForm] = useState({ lineId: null, inventory_item_id: "", quantity_ordered: "1", unit_price: "" });
  const [poEditLineSaving, setPoEditLineSaving] = useState(false);

  // Inventory items
  const invReqId = useRef(0);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryItemsLoading, setInventoryItemsLoading] = useState(false);
  const [inventoryItemsPage, setInventoryItemsPage] = useState(0);
  const [inventoryItemsRowsPerPage, setInventoryItemsRowsPerPage] = useState(10);
  const [inventoryItemsTotal, setInventoryItemsTotal] = useState(0);
  const [itemsSearch, setItemsSearch] = useState("");
  const [itemDialog, setItemDialog] = useState({ open: false, mode: "create", id: null });
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    quantity_available: "",
    reorder_level: "",
    unit: "",
    pack_size: "",
  });
  const [itemView, setItemView] = useState({ open: false, data: null });
  const [itemSaving, setItemSaving] = useState(false);

  // Stock in/out (view only)
  const txReqId = useRef(0);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [transactionsRowsPerPage, setTransactionsRowsPerPage] = useState(10);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [txTypeFilter, setTxTypeFilter] = useState("");
  const [stockTxOpen, setStockTxOpen] = useState(false);
  const [stockTxForm, setStockTxForm] = useState({
    inventory_item_id: "",
    transaction_type: "in",
    quantity: "",
    unit_type: "unit",
  });
  const [stockTxSaving, setStockTxSaving] = useState(false);
  const [transferToPharmacyOpen, setTransferToPharmacyOpen] = useState(false);
  const [transferToPharmacyItem, setTransferToPharmacyItem] = useState(null);
  const [transferToPharmacyQty, setTransferToPharmacyQty] = useState("");
  const [transferToPharmacySaving, setTransferToPharmacySaving] = useState(false);

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const loadSuppliers = async () => {
    const reqId = ++suppReqId.current;
    setSuppliersLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(suppliersPage + 1),
        limit: String(suppliersRowsPerPage),
        ...(suppliersSearch.trim() ? { search: suppliersSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.suppliers}?${qs.toString()}`, { token });
      if (reqId !== suppReqId.current) return;
      setSuppliers(data?.data || []);
      setSuppliersTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== suppReqId.current) return;
      setSuppliers([]);
      setSuppliersTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load suppliers" });
    } finally {
      if (reqId === suppReqId.current) setSuppliersLoading(false);
    }
  };

  const loadSupplierOptions = async () => {
    try {
      const data = await fetchJson(`${API.suppliers}?limit=500`, { token });
      setSupplierOptions(data?.data || []);
    } catch {
      setSupplierOptions([]);
    }
  };

  const loadPurchaseOrders = async () => {
    const reqId = ++poReqId.current;
    setPurchaseOrdersLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(purchaseOrdersPage + 1),
        limit: String(purchaseOrdersRowsPerPage),
        ...(poStatusFilter ? { search: poStatusFilter } : {}),
      });
      const data = await fetchJson(`${API.purchaseOrders}?${qs.toString()}`, { token });
      if (reqId !== poReqId.current) return;
      setPurchaseOrders(data?.data || []);
      setPurchaseOrdersTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== poReqId.current) return;
      setPurchaseOrders([]);
      setPurchaseOrdersTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load purchase orders" });
    } finally {
      if (reqId === poReqId.current) setPurchaseOrdersLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    const reqId = ++invReqId.current;
    setInventoryItemsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(inventoryItemsPage + 1),
        limit: String(inventoryItemsRowsPerPage),
        ...(itemsSearch.trim() ? { search: itemsSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.inventory}?${qs.toString()}`, { token });
      if (reqId !== invReqId.current) return;
      setInventoryItems(data?.data || []);
      setInventoryItemsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== invReqId.current) return;
      setInventoryItems([]);
      setInventoryItemsTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load inventory items" });
    } finally {
      if (reqId === invReqId.current) setInventoryItemsLoading(false);
    }
  };

  const loadTransactions = async () => {
    const reqId = ++txReqId.current;
    setTransactionsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(transactionsPage + 1),
        limit: String(transactionsRowsPerPage),
        ...(txTypeFilter ? { transaction_type: txTypeFilter } : {}),
      });
      const data = await fetchJson(`${API.inventoryTransactions}?${qs.toString()}`, { token });
      if (reqId !== txReqId.current) return;
      setTransactions(data?.data || []);
      setTransactionsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== txReqId.current) return;
      setTransactions([]);
      setTransactionsTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load transactions" });
    } finally {
      if (reqId === txReqId.current) setTransactionsLoading(false);
    }
  };

  const openStockTx = () => {
    loadInventoryItemOptions();
    setStockTxForm({
      inventory_item_id: "",
      transaction_type: "in",
      quantity: "",
      unit_type: "unit",
    });
    setStockTxOpen(true);
  };

  const saveStockTx = async () => {
    if (!stockTxForm.inventory_item_id) {
      Swal.fire({ icon: "warning", title: "Required", text: "Select an inventory item." });
      return;
    }
    const qty = parseInt(stockTxForm.quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      Swal.fire({ icon: "warning", title: "Invalid quantity", text: "Enter a number greater than 0." });
      return;
    }
    setStockTxSaving(true);
    try {
      await fetchJson(API.inventoryTransactions, {
        method: "POST",
        token,
        body: {
          inventory_item_id: stockTxForm.inventory_item_id,
          transaction_type: stockTxForm.transaction_type,
          quantity: qty,
          unit_type: stockTxForm.unit_type || "unit",
        },
      });
      setStockTxOpen(false);
      loadTransactions();
      loadInventoryItems();
      Swal.fire({ icon: "success", title: "Recorded", text: "Stock movement recorded.", timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setStockTxSaving(false);
    }
  };

  // Skip first run of debounced search so tab-gated effect does the initial load only (avoids double blink)
  const suppliersSearchDebounceSkipped = useRef(true);
  const itemsSearchDebounceSkipped = useRef(true);

  useEffect(() => {
    if (tab === 0) loadSuppliers();
  }, [tab, suppliersPage, suppliersRowsPerPage, suppliersSearch]);

  useEffect(() => {
    if (tab === 1) loadInventoryItems();
  }, [tab, inventoryItemsPage, inventoryItemsRowsPerPage, itemsSearch]);

  useEffect(() => {
    if (tab === 2) {
      loadSupplierOptions();
      loadPurchaseOrders();
    }
  }, [tab, purchaseOrdersPage, purchaseOrdersRowsPerPage, poStatusFilter]);

  useEffect(() => {
    if (tab === 3) loadTransactions();
  }, [tab, transactionsPage, transactionsRowsPerPage, txTypeFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 0) return;
      if (suppliersSearchDebounceSkipped.current) {
        suppliersSearchDebounceSkipped.current = false;
        return;
      }
      if (suppliersSearch !== undefined) loadSuppliers();
    }, 400);
    return () => clearTimeout(t);
  }, [suppliersSearch, tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 1) return;
      if (itemsSearchDebounceSkipped.current) {
        itemsSearchDebounceSkipped.current = false;
        return;
      }
      if (itemsSearch !== undefined) loadInventoryItems();
    }, 400);
    return () => clearTimeout(t);
  }, [itemsSearch, tab]);

  // ——— Suppliers CRUD ———
  const openSupplierCreate = () => {
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
    setSupplierDialog({ open: true, mode: "create", id: null });
  };

  const openSupplierEdit = (row) => {
    setSupplierForm({
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
    });
    setSupplierDialog({ open: true, mode: "edit", id: row.id });
  };

  const openSupplierView = async (id) => {
    try {
      const data = await fetchJson(`${API.suppliers}/${id}`, { token });
      setSupplierView({ open: true, data: data?.data || null });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const saveSupplier = async () => {
    if (!supplierForm.name?.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Supplier name is required." });
      return;
    }
    setSupplierSaving(true);
    try {
      const payload = {
        name: supplierForm.name.trim(),
        phone: supplierForm.phone?.trim() || null,
        email: supplierForm.email?.trim() || null,
        address: supplierForm.address?.trim() || null,
      };
      if (supplierDialog.mode === "create") {
        await fetchJson(API.suppliers, { method: "POST", token, body: payload });
        Swal.fire({ icon: "success", title: "Created", timer: 1200, showConfirmButton: false });
      } else {
        await fetchJson(`${API.suppliers}/${supplierDialog.id}`, { method: "PUT", token, body: payload });
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      }
      setSupplierDialog({ open: false, mode: "create", id: null });
      loadSuppliers();
      loadSupplierOptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setSupplierSaving(false);
    }
  };

  const deleteSupplier = async (id) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete supplier?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.suppliers}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadSuppliers();
      loadSupplierOptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const loadInventoryItemOptions = async () => {
    try {
      const data = await fetchJson(`${API.inventory}?limit=500`, { token });
      setInventoryItemOptions(data?.data || []);
    } catch {
      setInventoryItemOptions([]);
    }
  };

  // ——— Purchase orders CRUD ———
  const openPOCreate = () => {
    loadInventoryItemOptions();
    setPoForm({
      supplier_id: "",
      order_date: new Date().toISOString().slice(0, 10),
      status: "draft",
      items: [],
    });
    setPoDialog({ open: true, mode: "create", id: null });
  };

  const addPOLineRow = () => {
    setPoForm((p) => ({ ...p, items: [...(p.items || []), { inventory_item_id: "", quantity_ordered: 1, unit_price: "" }] }));
  };

  const removePOLineRow = (index) => {
    setPoForm((p) => ({ ...p, items: (p.items || []).filter((_, i) => i !== index) }));
  };

  const updatePOLineRow = (index, field, value) => {
    setPoForm((p) => {
      const items = [...(p.items || [])];
      if (!items[index]) return p;
      items[index] = { ...items[index], [field]: value };
      return { ...p, items };
    });
  };

  const openPOEdit = (row) => {
    setPoForm({
      supplier_id: row.supplier_id || "",
      order_date: row.order_date ? new Date(row.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: row.status || "draft",
      items: [], // edit does not change line items
    });
    setPoDialog({ open: true, mode: "edit", id: row.id });
  };

  const openPOView = async (id) => {
    try {
      const data = await fetchJson(`${API.purchaseOrders}/${id}`, { token });
      setPoView({ open: true, data: data?.data || null });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const savePO = async () => {
    if (!poForm.supplier_id) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please select a supplier." });
      return;
    }
    setPoSaving(true);
    try {
      const payload = {
        supplier_id: poForm.supplier_id,
        order_date: new Date(poForm.order_date).toISOString(),
        status: poForm.status || "draft",
      };
      if (poDialog.mode === "create") {
        const items = (poForm.items || []).filter((i) => i.inventory_item_id);
        if (items.length) payload.items = items.map((i) => ({ inventory_item_id: i.inventory_item_id, quantity_ordered: Number(i.quantity_ordered) || 1, unit_price: i.unit_price !== "" && i.unit_price != null ? Number(i.unit_price) : null }));
        await fetchJson(API.purchaseOrders, { method: "POST", token, body: payload });
        Swal.fire({ icon: "success", title: "Created", timer: 1200, showConfirmButton: false });
      } else {
        await fetchJson(`${API.purchaseOrders}/${poDialog.id}`, { method: "PUT", token, body: payload });
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      }
      setPoDialog({ open: false, mode: "create", id: null });
      loadPurchaseOrders();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setPoSaving(false);
    }
  };

  const openAddPOLine = () => {
    loadInventoryItemOptions();
    setPoAddLineForm({ inventory_item_id: "", quantity_ordered: "1", unit_price: "" });
    setPoAddLineOpen(true);
  };

  const saveAddPOLine = async () => {
    if (!poView.data?.id) return;
    if (!poAddLineForm.inventory_item_id) {
      Swal.fire({ icon: "warning", title: "Required", text: "Select an item." });
      return;
    }
    setPoAddLineSaving(true);
    try {
      await fetchJson(`${API.purchaseOrders}/${poView.data.id}/items`, {
        method: "POST",
        token,
        body: {
          inventory_item_id: poAddLineForm.inventory_item_id,
          quantity_ordered: parseInt(poAddLineForm.quantity_ordered, 10) || 1,
          unit_price: poAddLineForm.unit_price !== "" && poAddLineForm.unit_price != null ? Number(poAddLineForm.unit_price) : null,
        },
      });
      setPoAddLineOpen(false);
      const data = await fetchJson(`${API.purchaseOrders}/${poView.data.id}`, { token });
      setPoView((p) => ({ ...p, data: data?.data || null }));
      loadPurchaseOrders();
      Swal.fire({ icon: "success", title: "Line added", timer: 1000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setPoAddLineSaving(false);
    }
  };

  const openEditPOLine = (line) => {
    loadInventoryItemOptions();
    setPoEditLineForm({
      lineId: line.id,
      inventory_item_id: line.inventory_item_id || line.inventoryItem?.id || "",
      quantity_ordered: String(line.quantity_ordered ?? 1),
      unit_price: line.unit_price != null ? String(line.unit_price) : "",
    });
    setPoEditLineOpen(true);
  };

  const saveEditPOLine = async () => {
    if (!poView.data?.id || !poEditLineForm.lineId) return;
    if (!poEditLineForm.inventory_item_id) {
      Swal.fire({ icon: "warning", title: "Required", text: "Select an item." });
      return;
    }
    setPoEditLineSaving(true);
    try {
      await fetchJson(`${API.purchaseOrders}/${poView.data.id}/items/${poEditLineForm.lineId}`, {
        method: "PUT",
        token,
        body: {
          inventory_item_id: poEditLineForm.inventory_item_id,
          quantity_ordered: parseInt(poEditLineForm.quantity_ordered, 10) || 1,
          unit_price: poEditLineForm.unit_price !== "" && poEditLineForm.unit_price != null ? Number(poEditLineForm.unit_price) : null,
        },
      });
      setPoEditLineOpen(false);
      const data = await fetchJson(`${API.purchaseOrders}/${poView.data.id}`, { token });
      setPoView((p) => ({ ...p, data: data?.data || null }));
      loadPurchaseOrders();
      Swal.fire({ icon: "success", title: "Line updated", timer: 1000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setPoEditLineSaving(false);
    }
  };

  const deletePOLine = async (line) => {
    if (!poView.data?.id) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove this line item?",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.purchaseOrders}/${poView.data.id}/items/${line.id}`, { method: "DELETE", token });
      const data = await fetchJson(`${API.purchaseOrders}/${poView.data.id}`, { token });
      setPoView((p) => ({ ...p, data: data?.data || null }));
      loadPurchaseOrders();
      Swal.fire({ icon: "success", title: "Line removed", timer: 1000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const deletePO = async (id) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete purchase order?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.purchaseOrders}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadPurchaseOrders();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  // ——— Inventory items CRUD ———
  const openItemCreate = () => {
    setItemForm({
      name: "",
      category: "",
      quantity_available: "0",
      reorder_level: "0",
      unit: "",
      pack_size: "",
    });
    setItemDialog({ open: true, mode: "create", id: null });
  };

  const openItemEdit = (row) => {
    setItemForm({
      name: row.name || "",
      category: row.category || "",
      quantity_available: String(row.quantity_available ?? 0),
      reorder_level: String(row.reorder_level ?? 0),
      unit: row.unit || "",
      pack_size: row.pack_size != null ? String(row.pack_size) : "",
    });
    setItemDialog({ open: true, mode: "edit", id: row.id });
  };

  const openItemView = async (id) => {
    try {
      const data = await fetchJson(`${API.inventory}/${id}`, { token });
      setItemView({ open: true, data: data?.data || null });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const saveItem = async () => {
    if (!itemForm.name?.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Item name is required." });
      return;
    }
    setItemSaving(true);
    try {
      const qty = parseInt(itemForm.quantity_available, 10);
      const reorder = parseInt(itemForm.reorder_level, 10);
      const packSize = itemForm.pack_size !== "" && itemForm.pack_size != null ? parseInt(itemForm.pack_size, 10) : null;
      const payload = {
        name: itemForm.name.trim(),
        category: itemForm.category?.trim() || null,
        quantity_available: Number.isInteger(qty) ? qty : 0,
        reorder_level: Number.isInteger(reorder) ? reorder : 0,
        unit: itemForm.unit?.trim() || null,
        pack_size: Number.isInteger(packSize) && packSize >= 0 ? packSize : null,
      };
      if (itemDialog.mode === "create") {
        await fetchJson(API.inventory, { method: "POST", token, body: payload });
        Swal.fire({ icon: "success", title: "Created", timer: 1200, showConfirmButton: false });
      } else {
        await fetchJson(`${API.inventory}/${itemDialog.id}`, { method: "PUT", token, body: payload });
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      }
      setItemDialog({ open: false, mode: "create", id: null });
      loadInventoryItems();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setItemSaving(false);
    }
  };

  const openTransferToPharmacy = (item) => {
    setTransferToPharmacyItem(item);
    setTransferToPharmacyQty("");
    setTransferToPharmacyOpen(true);
  };

  const saveTransferToPharmacy = async () => {
    if (!transferToPharmacyItem?.id) return;
    const qty = parseInt(transferToPharmacyQty, 10);
    if (Number.isNaN(qty) || qty < 1) {
      Swal.fire({ icon: "warning", title: "Invalid quantity", text: "Enter a positive number." });
      return;
    }
    setTransferToPharmacySaving(true);
    const itemId = transferToPharmacyItem.id;
    try {
      const data = await fetchJson(`${API.inventory}/${itemId}/transfer-to-pharmacy`, {
        method: "POST",
        token,
        body: { quantity: qty },
      });
      setTransferToPharmacyOpen(false);
      setTransferToPharmacyItem(null);
      if (itemView.data?.id === itemId) {
        setItemView((p) => ({ ...p, data: data?.data || null }));
      }
      loadInventoryItems();
      // Ensure item appears in medicine catalogue (create/link Medication if missing)
      try {
        await fetchJson(`${API.inventory}/${itemId}/add-to-pharmacy`, { method: "POST", token });
      } catch (_) {
        // Transfer succeeded; catalogue update is best-effort
      }
      Swal.fire({ icon: "success", title: data?.message || "Transferred to pharmacy", timer: 2500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setTransferToPharmacySaving(false);
    }
  };

  const deleteItem = async (id) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete inventory item?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.inventory}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadInventoryItems();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", width: "100%", minWidth: 0 }}>
      <Box sx={{ p: 2.5, background: heroGradient, color: "white", width: "100%", minWidth: "100%", flexShrink: 0, boxSizing: "border-box" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ width: "100%", minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
            Inventory
          </Typography>
        </Stack>
      </Box>

      <CardContent sx={{ p: 0 }}>
        {isMobile ? (
          <FormControl fullWidth size="small" sx={{ px: 2, pt: 3.5, pb: 1.5, "& .MuiInputLabel-shrink": { marginTop: 1 } }}>
            <InputLabel id="inventory-section-label">Section</InputLabel>
            <Select
              labelId="inventory-section-label"
              value={tab}
              label="Section"
              onChange={(e) => setTab(Number(e.target.value))}
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value={0}>Suppliers</MenuItem>
              <MenuItem value={1}>Inventory items</MenuItem>
              <MenuItem value={2}>Purchase orders</MenuItem>
              <MenuItem value={3}>Stock in / out</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}>
            <Tab icon={<SupplierIcon />} iconPosition="start" label="Suppliers" />
            <Tab icon={<ItemsIcon />} iconPosition="start" label="Inventory items" />
            <Tab icon={<PurchaseOrderIcon />} iconPosition="start" label="Purchase orders" />
            <Tab icon={<StockIcon />} iconPosition="start" label="Stock in / out" />
          </Tabs>
        )}
        <Divider />

        {/* Tab 0: Suppliers */}
        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Search (name, email, phone)"
                value={suppliersSearch}
                onChange={(e) => {
                  setSuppliersSearch(e.target.value);
                  setSuppliersPage(0);
                }}
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={openSupplierCreate} sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 140 }, whiteSpace: "nowrap" }}>
                Add supplier
              </Button>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 160 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Email</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 96, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : suppliers.length ? (
                    suppliers.map((s, idx) => (
                      <TableRow
                        key={s.id}
                        hover
                        onClick={isMobile ? () => openSupplierView(s.id) : undefined}
                        sx={isMobile ? { cursor: "pointer" } : undefined}
                      >
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{suppliersPage * suppliersRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "28vw", sm: 160, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>{s.name}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{s.phone || "—"}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{s.email || "—"}</TableCell>
                        <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }} onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: { xs: "repeat(2, auto)", md: "unset" }, flexDirection: { md: "row" }, gap: 0.5, justifyContent: "flex-end", justifyItems: { xs: "end" }, maxWidth: "100%" }}>
                            {!isMobile && (
                              <Tooltip title="View">
                                <IconButton size="small" color="primary" onClick={() => openSupplierView(s.id)} aria-label="View"><VisibilityIcon fontSize="inherit" /></IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openSupplierEdit(s)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => deleteSupplier(s.id)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No suppliers found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={suppliersTotal}
              page={suppliersPage}
              onPageChange={(_, p) => setSuppliersPage(p)}
              rowsPerPage={suppliersRowsPerPage}
              onRowsPerPageChange={(e) => {
                setSuppliersRowsPerPage(parseInt(e.target.value, 10));
                setSuppliersPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}

        {/* Tab 1: Inventory items */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Search (name, category)"
                value={itemsSearch}
                onChange={(e) => {
                  setItemsSearch(e.target.value);
                  setInventoryItemsPage(0);
                }}
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={openItemCreate} sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 160 } }}>
                Add item
              </Button>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Main store</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>In pharmacy</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 110 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Reorder level</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 80 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Unit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, minWidth: 160, overflow: "visible", textOverflow: "clip", whiteSpace: "nowrap" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryItemsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : inventoryItems.length ? (
                    inventoryItems.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        hover
                        onClick={isMobile ? () => openItemView(item.id) : undefined}
                        sx={isMobile ? { cursor: "pointer" } : undefined}
                      >
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{inventoryItemsPage * inventoryItemsRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "28vw", sm: 160, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>{item.name}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{item.quantity_available ?? 0}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{item.quantity_in_pharmacy ?? 0}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{item.reorder_level ?? 0}</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{item.unit || "—"}</TableCell>
                        <TableCell align="right" sx={{ overflow: "visible", minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 0.5, justifyContent: "flex-end", alignItems: "center", maxWidth: "100%" }}>
                            {!isMobile && (
                              <Tooltip title="View">
                                <IconButton size="small" onClick={() => openItemView(item.id)} color="inherit"><VisibilityIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openItemEdit(item)} color="inherit"><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => deleteItem(item.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Move stock to pharmacy">
                              <IconButton size="small" color="primary" onClick={() => openTransferToPharmacy(item)} aria-label="Move stock to pharmacy">
                                <StockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No inventory items found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={inventoryItemsTotal}
              page={inventoryItemsPage}
              onPageChange={(_, p) => setInventoryItemsPage(p)}
              rowsPerPage={inventoryItemsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setInventoryItemsRowsPerPage(parseInt(e.target.value, 10));
                setInventoryItemsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}

        {/* Tab 2: Purchase orders */}
        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2, width: "100%" }}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 160 } }}>
                <InputLabel>Status</InputLabel>
                <Select value={poStatusFilter} label="Status" onChange={(e) => { setPoStatusFilter(e.target.value); setPurchaseOrdersPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  {PO_STATUS_OPTIONS.map((st) => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1, minWidth: 0 }} />
              <Button variant="contained" startIcon={<AddIcon />} onClick={openPOCreate} sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 180 }, whiteSpace: "nowrap" }}>
                Add purchase order
              </Button>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Order date</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseOrdersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : purchaseOrders.length ? (
                    purchaseOrders.map((po, idx) => (
                      <TableRow
                        key={po.id}
                        hover
                        onClick={isMobile ? () => openPOView(po.id) : undefined}
                        sx={isMobile ? { cursor: "pointer" } : undefined}
                      >
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{purchaseOrdersPage * purchaseOrdersRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{po.supplier?.name ?? "—"}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDate(po.order_date)}</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                          <Chip size="small" label={po.status} color={po.status === "received" ? "success" : po.status === "cancelled" ? "default" : "primary"} variant="outlined" />
                        </TableCell>
                        <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }} onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: { xs: "repeat(2, auto)", md: "unset" }, flexDirection: { md: "row" }, gap: 0.5, justifyContent: "flex-end", justifyItems: { xs: "end" }, maxWidth: "100%" }}>
                            {!isMobile && (
                              <Tooltip title="View">
                                <IconButton size="small" color="primary" onClick={() => openPOView(po.id)} aria-label="View"><VisibilityIcon fontSize="inherit" /></IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openPOEdit(po)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => deletePO(po.id)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No purchase orders found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={purchaseOrdersTotal}
              page={purchaseOrdersPage}
              onPageChange={(_, p) => setPurchaseOrdersPage(p)}
              rowsPerPage={purchaseOrdersRowsPerPage}
              onRowsPerPageChange={(e) => {
                setPurchaseOrdersRowsPerPage(parseInt(e.target.value, 10));
                setPurchaseOrdersPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}

        {/* Tab 3: Stock in/out */}
        {tab === 3 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 160 } }}>
                <InputLabel>Type</InputLabel>
                <Select value={txTypeFilter} label="Type" onChange={(e) => { setTxTypeFilter(e.target.value); setTransactionsPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="in">In</MenuItem>
                  <MenuItem value="out">Out</MenuItem>
                  <MenuItem value="adjustment">Adjustment</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flex: 1, minWidth: 0 }} />
              <Button variant="contained" startIcon={<AddIcon />} onClick={openStockTx} sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 200 }, whiteSpace: "nowrap" }}>
                Record stock in/out
              </Button>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "18vw", sm: 90 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 90 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Unit type</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 110 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : transactions.length ? (
                    transactions.map((tx, idx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{transactionsPage * transactionsRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{tx.item?.name ?? "—"}</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                          <Chip size="small" label={tx.transaction_type} color={tx.transaction_type === "in" ? "success" : tx.transaction_type === "out" ? "warning" : "default"} variant="outlined" />
                        </TableCell>
                        <TableCell>{tx.quantity ?? 0}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{tx.unit_type || "unit"}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDateTime(tx.transaction_date)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No transactions found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={transactionsTotal}
              page={transactionsPage}
              onPageChange={(_, p) => setTransactionsPage(p)}
              rowsPerPage={transactionsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setTransactionsRowsPerPage(parseInt(e.target.value, 10));
                setTransactionsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}
      </CardContent>

      {/* Supplier create/edit dialog */}
      <Dialog open={supplierDialog.open} onClose={() => setSupplierDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>{supplierDialog.mode === "create" ? "Add supplier" : "Edit supplier"}</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth size="small" label="Name" value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} required />
            <TextField fullWidth size="small" label="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} />
            <TextField fullWidth size="small" label="Email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} />
            <TextField fullWidth size="small" label="Address" multiline minRows={2} value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveSupplier} disabled={supplierSaving}>{supplierSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Supplier view dialog */}
      <Dialog open={supplierView.open} onClose={() => setSupplierView({ open: false, data: null })} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Supplier details</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          {supplierView.data && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography><strong>Name:</strong> {supplierView.data.name}</Typography>
              <Typography><strong>Phone:</strong> {supplierView.data.phone || "—"}</Typography>
              <Typography><strong>Email:</strong> {supplierView.data.email || "—"}</Typography>
              <Typography><strong>Address:</strong> {supplierView.data.address || "—"}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierView({ open: false, data: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Purchase order create/edit dialog */}
      <Dialog open={poDialog.open} onClose={() => setPoDialog((p) => ({ ...p, open: false }))} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>{poDialog.mode === "create" ? "Add purchase order" : "Edit purchase order"}</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Supplier</InputLabel>
              <Select value={poForm.supplier_id} label="Supplier" onChange={(e) => setPoForm((p) => ({ ...p, supplier_id: e.target.value }))}>
                <MenuItem value="">Select supplier</MenuItem>
                {supplierOptions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Order date"
              type="date"
              value={poForm.order_date}
              onChange={(e) => setPoForm((p) => ({ ...p, order_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={poForm.status} label="Status" onChange={(e) => setPoForm((p) => ({ ...p, status: e.target.value }))}>
                {PO_STATUS_OPTIONS.map((st) => (
                  <MenuItem key={st} value={st}>{st}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {poDialog.mode === "create" && (
              <>
                <Typography variant="subtitle2" fontWeight={700}>Line items (optional)</Typography>
                <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflowX: "auto", maxWidth: "100%" }}>
                  <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                        <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "22vw", sm: 180 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 100, maxWidth: { xs: "16vw", sm: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Qty</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 120, maxWidth: { xs: "20vw", sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Unit price</TableCell>
                        <TableCell sx={{ width: 56, maxWidth: 56, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(poForm.items || []).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              size="small"
                              fullWidth
                              displayEmpty
                              value={row.inventory_item_id || ""}
                              onChange={(e) => updatePOLineRow(idx, "inventory_item_id", e.target.value)}
                              sx={{ minWidth: 180 }}
                            >
                              <MenuItem value="">Select item</MenuItem>
                              {inventoryItemOptions.map((it) => (
                                <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField type="number" size="small" inputProps={{ min: 1 }} value={row.quantity_ordered ?? 1} onChange={(e) => updatePOLineRow(idx, "quantity_ordered", e.target.value)} fullWidth />
                          </TableCell>
                          <TableCell>
                            <TextField type="number" size="small" inputProps={{ min: 0, step: 0.01 }} value={row.unit_price ?? ""} onChange={(e) => updatePOLineRow(idx, "unit_price", e.target.value)} placeholder="Optional" fullWidth />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => removePOLineRow(idx)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button size="small" startIcon={<AddIcon />} onClick={addPOLineRow} sx={{ alignSelf: "flex-start" }}>Add line</Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={savePO} disabled={poSaving}>{poSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Purchase order view dialog */}
      <Dialog open={poView.open} onClose={() => setPoView({ open: false, data: null })} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Purchase order details</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          {poView.data && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography><strong>Supplier:</strong> {poView.data.supplier?.name ?? "—"}</Typography>
              <Typography><strong>Order date:</strong> {formatDate(poView.data.order_date)}</Typography>
              <Typography><strong>Status:</strong> <Chip size="small" label={poView.data.status} /></Typography>
              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>Line items (what was ordered)</Typography>
              {poView.data.items?.length ? (
                <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflowX: "auto", maxWidth: "100%" }}>
                  <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                        <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Quantity ordered</TableCell>
                        <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Unit price</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {poView.data.items.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.inventoryItem?.name ?? "—"}</TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{line.quantity_ordered ?? 0}</TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{line.unit_price != null ? Number(line.unit_price).toLocaleString() : "—"}</TableCell>
                          <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }}>
                            <Box sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: { xs: "repeat(2, auto)", md: "unset" }, flexDirection: { md: "row" }, gap: 0.5, justifyContent: "flex-end", justifyItems: { xs: "end" }, maxWidth: "100%" }}>
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openEditPOLine(line)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => deletePOLine(line)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No line items.</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddPOLine}>Add line item</Button>
          <Button onClick={() => setPoView({ open: false, data: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add line item to PO dialog */}
      <Dialog open={poAddLineOpen} onClose={() => setPoAddLineOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Add line item</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Inventory item</InputLabel>
              <Select value={poAddLineForm.inventory_item_id} label="Inventory item" onChange={(e) => setPoAddLineForm((p) => ({ ...p, inventory_item_id: e.target.value }))}>
                <MenuItem value="">Select item</MenuItem>
                {inventoryItemOptions.map((it) => (
                  <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Quantity ordered" type="number" inputProps={{ min: 1 }} value={poAddLineForm.quantity_ordered} onChange={(e) => setPoAddLineForm((p) => ({ ...p, quantity_ordered: e.target.value }))} />
            <TextField fullWidth size="small" label="Unit price (optional)" type="number" inputProps={{ min: 0, step: 0.01 }} value={poAddLineForm.unit_price} onChange={(e) => setPoAddLineForm((p) => ({ ...p, unit_price: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoAddLineOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAddPOLine} disabled={poAddLineSaving}>{poAddLineSaving ? "Adding…" : "Add"}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit line item dialog */}
      <Dialog open={poEditLineOpen} onClose={() => setPoEditLineOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Edit line item</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Inventory item</InputLabel>
              <Select value={poEditLineForm.inventory_item_id} label="Inventory item" onChange={(e) => setPoEditLineForm((p) => ({ ...p, inventory_item_id: e.target.value }))}>
                <MenuItem value="">Select item</MenuItem>
                {inventoryItemOptions.map((it) => (
                  <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Quantity ordered" type="number" inputProps={{ min: 1 }} value={poEditLineForm.quantity_ordered} onChange={(e) => setPoEditLineForm((p) => ({ ...p, quantity_ordered: e.target.value }))} />
            <TextField fullWidth size="small" label="Unit price (optional)" type="number" inputProps={{ min: 0, step: 0.01 }} value={poEditLineForm.unit_price} onChange={(e) => setPoEditLineForm((p) => ({ ...p, unit_price: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoEditLineOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEditPOLine} disabled={poEditLineSaving}>{poEditLineSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Record stock in/out dialog */}
      <Dialog open={stockTxOpen} onClose={() => setStockTxOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Record stock in/out</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Inventory item</InputLabel>
              <Select value={stockTxForm.inventory_item_id} label="Inventory item" onChange={(e) => setStockTxForm((p) => ({ ...p, inventory_item_id: e.target.value }))}>
                <MenuItem value="">Select item</MenuItem>
                {inventoryItemOptions.map((it) => (
                  <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={stockTxForm.transaction_type} label="Type" onChange={(e) => setStockTxForm((p) => ({ ...p, transaction_type: e.target.value }))}>
                <MenuItem value="in">Stock in</MenuItem>
                <MenuItem value="out">Stock out</MenuItem>
                <MenuItem value="adjustment">Adjustment</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Quantity" type="number" inputProps={{ min: 1 }} value={stockTxForm.quantity} onChange={(e) => setStockTxForm((p) => ({ ...p, quantity: e.target.value }))} required helperText="Number of units or packs" />
            <FormControl fullWidth size="small">
              <InputLabel>Count as</InputLabel>
              <Select value={stockTxForm.unit_type} label="Count as" onChange={(e) => setStockTxForm((p) => ({ ...p, unit_type: e.target.value }))}>
                <MenuItem value="unit">Units (e.g. tablets, bottles)</MenuItem>
                <MenuItem value="pack">Packs (× item pack size)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockTxOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveStockTx} disabled={stockTxSaving}>{stockTxSaving ? "Recording…" : "Record"}</Button>
        </DialogActions>
      </Dialog>

      {/* Inventory item create/edit dialog */}
      <Dialog open={itemDialog.open} onClose={() => setItemDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>{itemDialog.mode === "create" ? "Add inventory item" : "Edit inventory item"}</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth size="small" label="Name" value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} required />
            <TextField fullWidth size="small" label="Category" value={itemForm.category} onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Medication, Consumables" />
            <TextField fullWidth size="small" label="Quantity available" type="number" inputProps={{ min: 0 }} value={itemForm.quantity_available} onChange={(e) => setItemForm((p) => ({ ...p, quantity_available: e.target.value }))} />
            <TextField fullWidth size="small" label="Reorder level" type="number" inputProps={{ min: 0 }} value={itemForm.reorder_level} onChange={(e) => setItemForm((p) => ({ ...p, reorder_level: e.target.value }))} helperText="Alert when stock falls below this" />
            <TextField fullWidth size="small" label="Unit" value={itemForm.unit} onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. tablet, bottle, pack" />
            <TextField fullWidth size="small" label="Pack size" type="number" inputProps={{ min: 0 }} value={itemForm.pack_size} onChange={(e) => setItemForm((p) => ({ ...p, pack_size: e.target.value }))} helperText="Units per pack (e.g. 20 tablets)" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveItem} disabled={itemSaving}>{itemSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Inventory item view dialog */}
      <Dialog open={itemView.open} onClose={() => setItemView({ open: false, data: null })} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Inventory item details</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          {itemView.data && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography><strong>Name:</strong> {itemView.data.name}</Typography>
              <Typography><strong>Category:</strong> {itemView.data.category || "—"}</Typography>
              <Typography><strong>Quantity in main store:</strong> {itemView.data.quantity_available ?? 0}</Typography>
              <Typography><strong>Quantity in pharmacy:</strong> {itemView.data.quantity_in_pharmacy ?? 0}</Typography>
              <Typography><strong>Reorder level:</strong> {itemView.data.reorder_level ?? 0}</Typography>
              <Typography><strong>Unit:</strong> {itemView.data.unit || "—"}</Typography>
              <Typography><strong>Pack size:</strong> {itemView.data.pack_size != null ? itemView.data.pack_size : "—"}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {itemView.data?.id && (
            <Button variant="outlined" startIcon={<StockIcon />} onClick={() => openTransferToPharmacy(itemView.data)} title="Move units from main store to pharmacy" sx={{ mr: "auto" }}>
              Move stock to pharmacy
            </Button>
          )}
          <Button onClick={() => setItemView({ open: false, data: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Move stock to pharmacy dialog */}
      <Dialog open={transferToPharmacyOpen} onClose={() => setTransferToPharmacyOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Move stock to pharmacy</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          {transferToPharmacyItem && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">{transferToPharmacyItem.name}</Typography>
              <Typography variant="body2"><strong>In main store:</strong> {transferToPharmacyItem.quantity_available ?? 0} {transferToPharmacyItem.unit || "units"}</Typography>
              <TextField
                fullWidth
                size="small"
                label="Quantity to transfer"
                type="number"
                inputProps={{ min: 1, max: transferToPharmacyItem.quantity_available ?? 0 }}
                value={transferToPharmacyQty}
                onChange={(e) => setTransferToPharmacyQty(e.target.value)}
                helperText="Main store quantity will decrease; pharmacy quantity will increase."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferToPharmacyOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveTransferToPharmacy} disabled={transferToPharmacySaving}>
            {transferToPharmacySaving ? "Transferring…" : "Transfer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
