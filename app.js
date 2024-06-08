const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(bodyParser.json())

// Mock data (replace this with actual database integration)
let database = []

// Initialize Database Logic
const initializeDatabase = async () => {
  try {
    const response = await axios.get(
      'https://s3.amazonaws.com/roxiler.com/product_transaction.json',
    )
    database = response.data

    return {success: true, message: 'Database initialized successfully'}
  } catch (error) {
    console.error('Error initializing database:', error)
    return {success: false, error: 'Internal server error'}
  }
}

// List Transactions Logic
const listTransactions = (month, search, page, perPage) => {
  // Filter transactions by month
  let filteredTransactions = database.filter(transaction => {
    const transactionDate = new Date(transaction.dateOfSale)
    return transactionDate.getMonth() === month
  })

  // Search functionality
  if (search) {
    filteredTransactions = filteredTransactions.filter(
      transaction =>
        transaction.title.toLowerCase().includes(search.toLowerCase()) ||
        transaction.description.toLowerCase().includes(search.toLowerCase()) ||
        String(transaction.price).includes(search),
    )
  }

  // Pagination
  const totalTransactions = filteredTransactions.length
  const totalPages = Math.ceil(totalTransactions / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = Math.min(startIndex + perPage, totalTransactions)

  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  return {transactions: paginatedTransactions, totalPages}
}

// Statistics Logic
const calculateStatistics = month => {
  const filteredTransactions = database.filter(transaction => {
    const transactionDate = new Date(transaction.dateOfSale)
    return transactionDate.getMonth() === month
  })

  const totalSaleAmount = filteredTransactions.reduce(
    (total, transaction) => total + transaction.price,
    0,
  )
  const totalSoldItems = filteredTransactions.length
  const totalNotSoldItems = database.length - totalSoldItems

  return {totalSaleAmount, totalSoldItems, totalNotSoldItems}
}

// Pie Chart Logic
const generatePieChartData = month => {
  const categoriesMap = new Map()
  database.forEach(transaction => {
    const transactionDate = new Date(transaction.dateOfSale)
    if (transactionDate.getMonth() === month) {
      if (categoriesMap.has(transaction.category)) {
        categoriesMap.set(
          transaction.category,
          categoriesMap.get(transaction.category) + 1,
        )
      } else {
        categoriesMap.set(transaction.category, 1)
      }
    }
  })

  const pieChartData = []
  categoriesMap.forEach((value, key) => {
    pieChartData.push({category: key, count: value})
  })

  return pieChartData
}

// Combined API Logic
const getCombinedData = async (month, search, page, perPage) => {
  const transactions = listTransactions(month, search, page, perPage)
  const statistics = calculateStatistics(month)
  const pieChartData = generatePieChartData(month)

  return {transactions, statistics, pieChartData}
}

// Routes
app.get('/initialize-database', async (req, res) => {
  const result = await initializeDatabase()
  res.json(result)
})

app.get('/transactions', (req, res) => {
  const {month, search, page = 1, perPage = 10} = req.query
  const result = listTransactions(
    parseInt(month),
    search,
    parseInt(page),
    parseInt(perPage),
  )
  res.json(result)
})

app.get('/statistics', (req, res) => {
  const {month} = req.query
  const result = calculateStatistics(parseInt(month))
  res.json(result)
})

app.get('/pie-chart', (req, res) => {
  const {month} = req.query
  const result = generatePieChartData(parseInt(month))
  res.json(result)
})

app.get('/combined-data', async (req, res) => {
  const {month, search, page, perPage} = req.query
  try {
    const result = await getCombinedData(
      parseInt(month),
      search,
      parseInt(page),
      parseInt(perPage),
    )
    res.json(result)
  } catch (error) {
    res.status(500).json({error: error.message})
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
