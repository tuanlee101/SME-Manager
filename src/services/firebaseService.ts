import { 
  db, 
  storage,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  runTransaction,
  writeBatch,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  OperationType,
  handleFirestoreError
} from "../firebase";

// --- Storage ---
export const uploadProductImage = (
  file: File,
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop();
    const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
};

export const deleteProductImage = async (url: string) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // Ignore if file not found
  }
};

// --- Categories ---
export const getCategories = (callback: (data: any[]) => void) => {
  const q = query(collection(db, "categories"), where("isDeleted", "==", false));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "categories"));
};

export const createCategory = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "categories"), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "categories");
  }
};

export const updateCategory = async (id: string, data: any) => {
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
};

export const bulkDeleteCategories = async (ids: string[]) => {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, "categories", id), { isDeleted: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "categories/bulk");
  }
};

export const getOrCreateCategory = async (name: string): Promise<string> => {
  try {
    const normalized = name.trim();
    // Check if category exists (case-insensitive via normalized name)
    const q = query(collection(db, "categories"), where("isDeleted", "==", false));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(
      d => d.data().name?.trim().toLowerCase() === normalized.toLowerCase()
    );
    if (existing) return existing.id;

    // Create new category
    const docRef = await addDoc(collection(db, "categories"), {
      name: normalized,
      description: "",
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "categories");
    throw error;
  }
};


export const getProducts = (categoryId: string | null, search: string | null, callback: (data: any[]) => void) => {
  let q = query(collection(db, "products"), where("isDeleted", "==", false));
  
  if (categoryId) {
    q = query(q, where("categoryId", "==", categoryId));
  }
  
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    if (search) {
      data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "products"));
};

export const createProduct = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "products"), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "products");
  }
};

export const updateProduct = async (id: string, data: any) => {
  try {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
};

export const bulkDeleteProducts = async (ids: string[]) => {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, "products", id), { isDeleted: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "products/bulk");
  }
};

export const bulkCreateProducts = async (products: any[]) => {
  try {
    const BATCH_SIZE = 499;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = products.slice(i, i + BATCH_SIZE);
      for (const p of chunk) {
        const docRef = doc(collection(db, "products"));
        // Strip undefined fields — Firestore rejects them
        const clean = Object.fromEntries(
          Object.entries(p).filter(([, v]) => v !== undefined)
        );
        batch.set(docRef, {
          ...clean,
          isDeleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "products/bulk");
  }
};

// --- Customers ---
export const getCustomers = (search: string | null, callback: (data: any[]) => void) => {
  const q = query(collection(db, "customers"), where("isDeleted", "==", false));
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    if (search) {
      data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
    }
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "customers"));
};

export const createCustomer = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "customers"), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "customers");
  }
};

export const updateCustomer = async (id: string, data: any) => {
  try {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
  }
};

export const bulkDeleteCustomers = async (ids: string[]) => {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, "customers", id), { isDeleted: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "customers/bulk");
  }
};

// --- Invoices ---
export const getInvoices = (callback: (data: any[]) => void) => {
  const q = query(collection(db, "invoices"), where("isDeleted", "==", false), orderBy("createdAt", "desc"));
  return onSnapshot(q, async (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    if (invoices.length === 0) { callback([]); return; }

    // Join customer info
    const customerIds = [...new Set(invoices.map(inv => inv.customerId).filter(Boolean))];
    const customerMap: Record<string, any> = {};
    await Promise.all(
      customerIds.map(async (id) => {
        const snap = await getDoc(doc(db, "customers", id as string));
        if (snap.exists()) customerMap[id as string] = { id: snap.id, ...snap.data() };
      })
    );

    callback(invoices.map(inv => ({ ...inv, customer: customerMap[inv.customerId] ?? null })));
  }, (error) => handleFirestoreError(error, OperationType.LIST, "invoices"));
};

export const bulkDeleteInvoices = async (ids: string[]) => {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, "invoices", id), { isDeleted: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "invoices/bulk");
  }
};

export const createInvoice = async (data: { customerId: string, items: any[], status: string }) => {
  const { customerId, items, status } = data;
  try {
    // Get invoice count outside transaction (getDocs not allowed inside runTransaction)
    const countSnap = await getDocs(query(collection(db, "invoices")));
    const number = `INV-${new Date().getFullYear()}-${(countSnap.size + 1).toString().padStart(4, "0")}`;
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return await runTransaction(db, async (transaction) => {
      // PHASE 1: All reads first
      const prodRefs = items.map(item => doc(db, "products", item.productId));
      const prodSnaps = await Promise.all(prodRefs.map(ref => transaction.get(ref)));

      // PHASE 2: All writes
      const invRef = doc(collection(db, "invoices"));
      transaction.set(invRef, {
        customerId,
        totalAmount,
        status,
        number,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemRef = doc(collection(db, "invoiceItems"));
        transaction.set(itemRef, {
          ...item,
          invoiceId: invRef.id,
          createdAt: serverTimestamp()
        });

        const prodSnap = prodSnaps[i];
        if (prodSnap.exists()) {
          const currentStock = prodSnap.data().stock || 0;
          transaction.update(prodRefs[i], { stock: currentStock - item.quantity });
        }
      }

      return invRef.id;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "invoices");
  }
};

// --- Dashboard Stats ---
export const getDashboardStats = (callback: (data: any) => void) => {
  const q = query(collection(db, "invoices"), where("isDeleted", "==", false), where("status", "==", "paid"));
  return onSnapshot(q, async (snapshot) => {
    const revenue = snapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
    const orders = snapshot.size;
    
    // Low stock
    const prodQ = query(collection(db, "products"), where("isDeleted", "==", false), where("stock", "<=", 10));
    const prodSnap = await getDocs(prodQ);
    const lowStock = prodSnap.size;

    callback({
      revenue,
      orders,
      lowStock,
      topProducts: [] // Simplified for now
    });
  }, (error) => handleFirestoreError(error, OperationType.GET, "dashboard/stats"));
};

export const getReportData = (
  callback: (data: { invoices: any[]; invoiceItems: any[]; productMap: Record<string, any> }) => void
) => {
  const q = query(collection(db, "invoices"), where("isDeleted", "==", false));
  return onSnapshot(q, async (snapshot) => {
    try {
      const invoices = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const [itemsSnap, productsSnap] = await Promise.all([
        getDocs(collection(db, "invoiceItems")),
        getDocs(query(collection(db, "products"), where("isDeleted", "==", false))),
      ]);
      const invoiceItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const productMap: Record<string, any> = {};
      productsSnap.docs.forEach(d => { productMap[d.id] = { id: d.id, ...d.data() }; });
      callback({ invoices, invoiceItems, productMap });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "reports");
    }
  });
};

export const getReports = (callback: (data: any) => void) => {
  return onSnapshot(collection(db, "invoices"), async (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOrders = invoices.length;
    
    const dailyRevenue: any = {};
    invoices.forEach(inv => {
      if (inv.createdAt) {
        const date = new Date(inv.createdAt.seconds * 1000).toLocaleDateString();
        dailyRevenue[date] = (dailyRevenue[date] || 0) + inv.total;
      }
    });

    const chartData = Object.keys(dailyRevenue).map(date => ({
      date,
      revenue: dailyRevenue[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);

    callback({
      totalRevenue,
      totalOrders,
      chartData,
      topProducts: [],
      categoryStats: []
    });
  });
};
