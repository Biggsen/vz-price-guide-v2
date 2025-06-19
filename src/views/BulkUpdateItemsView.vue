<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { categories } from '../constants.js'

const db = useFirestore()
const dbItems = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedItems = ref([])
const updating = ref(false)
const updateResult = ref(null)
const newCategory = ref('')
const newSubcategory = ref('')
const newPrice = ref('')
const sortKey = ref('name')
const sortAsc = ref(true)
const showOnlyNoCategory = ref(false)

async function loadDbItems() {
  const snapshot = await getDocs(collection(db, 'items'))
  dbItems.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

onMounted(async () => {
  await loadDbItems()
  loading.value = false
})

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let items = dbItems.value.filter(item =>
    item.name && item.name.toLowerCase().includes(query)
  )
  if (showOnlyNoCategory.value) {
    items = items.filter(item => !item.category || item.category === '')
  }
  if (sortKey.value) {
    items = [...items].sort((a, b) => {
      let aVal = a[sortKey.value]?.toString().toLowerCase() || ''
      let bVal = b[sortKey.value]?.toString().toLowerCase() || ''
      if (aVal < bVal) return sortAsc.value ? -1 : 1
      if (aVal > bVal) return sortAsc.value ? 1 : -1
      return 0
    })
  }
  return items
})

function setSort(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function isSelected(itemId) {
  return selectedItems.value.includes(itemId)
}

function toggleSelectItem(itemId) {
  if (isSelected(itemId)) {
    selectedItems.value = selectedItems.value.filter(id => id !== itemId)
  } else {
    selectedItems.value.push(itemId)
  }
}

function toggleSelectAll(checked) {
  if (checked) {
    selectedItems.value = filteredItems.value.map(item => item.id)
  } else {
    selectedItems.value = []
  }
}

const allSelected = computed(() => {
  return filteredItems.value.length > 0 && filteredItems.value.every(item => selectedItems.value.includes(item.id))
})

const anySelected = computed(() => selectedItems.value.length > 0)

async function updateSelectedCategories() {
  if (!newCategory.value) return
  updating.value = true
  updateResult.value = null
  let updated = 0, failed = 0
  for (const id of selectedItems.value) {
    try {
      await updateDoc(doc(db, 'items', id), {
        category: newCategory.value,
        subcategory: newSubcategory.value
      })
      updated++
    } catch (e) {
      failed++
    }
  }
  updateResult.value = `Updated: ${updated}, Failed: ${failed}`
  await loadDbItems()
  updating.value = false
  selectedItems.value = []
  newCategory.value = ''
  newSubcategory.value = ''
}

async function clearSelectedCategories() {
  if (!anySelected.value) return
  updating.value = true
  updateResult.value = null
  let updated = 0, failed = 0
  for (const id of selectedItems.value) {
    try {
      await updateDoc(doc(db, 'items', id), {
        category: '',
        subcategory: ''
      })
      updated++
    } catch (e) {
      failed++
    }
  }
  updateResult.value = `Cleared: ${updated}, Failed: ${failed}`
  await loadDbItems()
  updating.value = false
  selectedItems.value = []
}

async function updateSelectedPrices() {
  if (!newPrice.value || !anySelected.value) return
  updating.value = true
  updateResult.value = null
  let updated = 0, failed = 0
  for (const id of selectedItems.value) {
    try {
      await updateDoc(doc(db, 'items', id), {
        price: parseFloat(newPrice.value)
      })
      updated++
    } catch (e) {
      failed++
    }
  }
  updateResult.value = `Price updated: ${updated}, Failed: ${failed}`
  await loadDbItems()
  updating.value = false
  selectedItems.value = []
  newPrice.value = ''
}
</script>

<template>
  <div class="p-4 pt-8">
    <h2 class="text-xl font-bold mb-6">Bulk update items</h2>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <!-- Search input on its own line -->
      <div class="mb-4">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search for an item..."
          class="border-2 border-gray-asparagus rounded px-3 py-1 w-full max-w-md"
        />
      </div>

      <!-- Categories section -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold mb-2">Categories</h3>
        <div class="flex gap-4 items-center mb-2">
          <select v-model="newCategory" class="border-2 border-gray-asparagus rounded px-3 py-1">
            <option value="">Set category...</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <input
            type="text"
            v-model="newSubcategory"
            placeholder="Subcategory (optional)"
            class="border-2 border-gray-asparagus rounded px-3 py-1 w-48"
          />
        </div>
        
        <!-- Buttons on their own line -->
        <div class="flex gap-4 items-center">
          <button
            @click="updateSelectedCategories"
            :disabled="!anySelected || !newCategory || updating"
            class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
          >
            Update Selected
          </button>
          <button
            @click="clearSelectedCategories"
            :disabled="!anySelected || updating"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Clear Category
          </button>
          <span v-if="updating" class="ml-2">Updating...</span>
          <span v-if="updateResult" class="ml-2">{{ updateResult }}</span>
        </div>
      </div>

      <div class="mb-4">
        <label class="inline-flex items-center">
          <input type="checkbox" v-model="showOnlyNoCategory" class="mr-2 align-middle" />
          Show only items without a category
        </label>
      </div>

      <!-- Price section -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold mb-2">Price</h3>
        <div class="flex gap-4 items-center">
          <input
            type="number"
            v-model="newPrice"
            placeholder="New price"
            step="0.01"
            min="0"
            class="border-2 border-gray-asparagus rounded px-3 py-1 w-32"
          />
          <button
            @click="updateSelectedPrices"
            :disabled="!anySelected || !newPrice || updating"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Update Price
          </button>
        </div>
      </div>
      <table class="table-auto w-full">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll($event.target.checked)"
                :disabled="filteredItems.length === 0"
              />
            </th>
            <th>Material ID</th>
            <th @click="setSort('name')" class="cursor-pointer select-none">
              Name
              <span v-if="sortKey === 'name'">{{ sortAsc ? '▲' : '▼' }}</span>
            </th>
            <th @click="setSort('category')" class="cursor-pointer select-none">
              Category
              <span v-if="sortKey === 'category'">{{ sortAsc ? '▲' : '▼' }}</span>
            </th>
            <th @click="setSort('subcategory')" class="cursor-pointer select-none">
              Subcategory
              <span v-if="sortKey === 'subcategory'">{{ sortAsc ? '▲' : '▼' }}</span>
            </th>
            <th @click="setSort('price')" class="cursor-pointer select-none">
              Price
              <span v-if="sortKey === 'price'">{{ sortAsc ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td>
              <input
                type="checkbox"
                :checked="isSelected(item.id)"
                @change="toggleSelectItem(item.id)"
              />
            </td>
            <td>{{ item.material_id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.subcategory }}</td>
            <td>{{ item.price }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
table {
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5rem;
}
</style> 