'use client'

import { useState, useCallback, useMemo, Fragment } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import {
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineChartBarSquare,
  HiOutlineDocumentText,
  HiOutlineMapPin,
  HiOutlineFlag,
  HiOutlineArrowTrendingUp,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineFunnel,
  HiOutlinePencilSquare,
  HiOutlineClipboardDocumentCheck,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineBolt,
  HiOutlineTag,
  HiOutlineArchiveBox,
  HiOutlineGlobeAlt,
  HiOutlineLink,
  HiOutlineSignal,
} from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Agent IDs ───
const AGENT_IDS = {
  auctionScout: '699b99a16aebb68b8d73f2f9',
  marketArbitrage: '699b99a2108f0261e19ab10c',
  storefront: '699b99a2ee4ca13638216a70',
  inspectionScheduler: '699b99a27487a4b9395d28a1',
  liveInventory: '699bac59a672b9b9376d7ef2',
} as const

// ─── Types ───
interface Candidate {
  item_name: string
  description: string
  source: string
  category: string
  current_bid: string
  condition: string
  estimated_value: string
  lot_id: string
  auction_end_date: string
  flags: string[]
}

interface Analysis {
  item_name: string
  auction_price: string
  market_price: string
  buyer_premium: string
  shipping_estimate: string
  platform_fees: string
  net_profit: string
  roi_percentage: string
  roi_rating: string
  risk_flags: string[]
  comparable_sales: string[]
  recommendation: string
}

interface Listing {
  product_title: string
  description: string
  suggested_price: string
  compare_at_price: string
  tags: string[]
  category: string
  shipping_terms: string
  processing_note: string
  condition_description: string
  seo_keywords: string[]
}

interface LocalLot {
  item_name: string
  source: string
  location: string
  distance_miles: string
  inspection_dates: string
  lot_id: string
  current_bid: string
  category: string
  checklist: string[]
}

interface LiveInventoryItem {
  item_name: string
  description: string
  source_url: string
  current_price: string
  condition: string
  lot_id: string
  availability: string
  category: string
  special_notes: string
  time_sensitive: boolean
}

interface PriorityItem {
  id: string
  item_name: string
  customer_ref: string
  lot_id: string
  status: string
  created_at: number
  hold_end: number
}

type Screen = 'dashboard' | 'scanner' | 'analysis' | 'drafts' | 'inspections' | 'priority' | 'inventory'

const PRIORITY_STAGES = [
  'Customer Purchased',
  'Auction Flagged',
  'Bid Placed',
  'Won',
  'Shipping',
  'Arrived',
]

const STAGE_COLORS: Record<string, string> = {
  'Customer Purchased': 'bg-blue-900/40 text-blue-300 border-blue-700',
  'Auction Flagged': 'bg-amber-900/40 text-amber-300 border-amber-700',
  'Bid Placed': 'bg-purple-900/40 text-purple-300 border-purple-700',
  Won: 'bg-green-900/40 text-green-300 border-green-700',
  Shipping: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  Arrived: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
}

function getRoiColor(rating: string) {
  const r = (rating || '').toUpperCase()
  if (r.includes('HIGH')) return 'text-green-400'
  if (r.includes('MODERATE')) return 'text-amber-400'
  if (r.includes('LOW')) return 'text-orange-400'
  return 'text-red-400'
}

function getRoiBadge(rating: string) {
  const r = (rating || '').toUpperCase()
  if (r.includes('HIGH')) return 'bg-green-900/40 text-green-300 border-green-700'
  if (r.includes('MODERATE')) return 'bg-amber-900/40 text-amber-300 border-amber-700'
  if (r.includes('LOW')) return 'bg-orange-900/40 text-orange-300 border-orange-700'
  return 'bg-red-900/40 text-red-300 border-red-700'
}

function formatCountdown(endMs: number) {
  const diff = endMs - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return `${days}d ${hours}h`
}

function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-4 p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 skeleton-shimmer rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-3 border-t border-border">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 skeleton-shimmer rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border">
          <CardHeader>
            <div className="h-5 w-3/4 skeleton-shimmer rounded" />
            <div className="h-4 w-1/2 skeleton-shimmer rounded mt-2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 skeleton-shimmer rounded" />
            <div className="h-4 w-5/6 skeleton-shimmer rounded" />
            <div className="h-4 w-2/3 skeleton-shimmer rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Main Component ───
export default function RecoveryHub() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [scanLoading, setScanLoading] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [listingLoading, setListingLoading] = useState(false)
  const [inspectionLoading, setInspectionLoading] = useState(false)

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [scanSummary, setScanSummary] = useState('')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [localLots, setLocalLots] = useState<LocalLot[]>([])

  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set())
  const [approvedAnalyses, setApprovedAnalyses] = useState<Set<number>>(new Set())
  const [approvedListings, setApprovedListings] = useState<Set<number>>(new Set())

  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null)
  const [expandedAnalysis, setExpandedAnalysis] = useState<number | null>(null)
  const [selectedLot, setSelectedLot] = useState<number>(0)
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({})

  const [priorityItems, setPriorityItems] = useState<PriorityItem[]>([])
  const [newPriorityName, setNewPriorityName] = useState('')
  const [newPriorityRef, setNewPriorityRef] = useState('')
  const [newPriorityLot, setNewPriorityLot] = useState('')

  const [scanError, setScanError] = useState('')
  const [analyzeError, setAnalyzeError] = useState('')
  const [listingError, setListingError] = useState('')
  const [inspectionError, setInspectionError] = useState('')
  const [inventoryError, setInventoryError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // Live Inventory
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<LiveInventoryItem[]>([])
  const [inventorySummary, setInventorySummary] = useState('')
  const [inventorySitesVisited, setInventorySitesVisited] = useState<string[]>([])
  const [inventoryTimestamp, setInventoryTimestamp] = useState('')
  const [inventoryUrl, setInventoryUrl] = useState('')
  const [inventoryQuery, setInventoryQuery] = useState('')
  const [expandedInventory, setExpandedInventory] = useState<number | null>(null)

  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')

  const [editingListing, setEditingListing] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const stats = useMemo(
    () => ({
      lotsScanned: candidates.length,
      itemsAnalyzed: analyses.length,
      draftsPending: listings.filter((_, i) => !approvedListings.has(i)).length,
      priorityFlags: priorityItems.length,
    }),
    [candidates, analyses, listings, approvedListings, priorityItems]
  )

  // ─── Agent Calls ───
  const handleScanAuctions = useCallback(async () => {
    setScanLoading(true)
    setScanError('')
    setStatusMessage('Scanning auction sources...')
    try {
      const result = await callAIAgent(
        "Scan all four auction sources (GSAAuctions.gov, Treasury.gov GP Auctions, AppleAuctioneering.com, USAAuctionOnline.com) for high-demand consumer electronics, jewelry, collectibles, and luxury goods. Filter for items with high flip potential, prioritize 'Original Packaging' and 'Like New' condition items. Return a structured candidate list sorted by estimated ROI potential.",
        AGENT_IDS.auctionScout
      )
      if (result.success && result.response) {
        const rawResult = result.response?.result || result.response
        const parsed = parseLLMJson(rawResult)
        const items = Array.isArray(parsed?.candidates) ? parsed.candidates : []
        setCandidates(items)
        setScanSummary(parsed?.scan_summary || `Found ${items.length} candidates`)
        setSelectedCandidates(new Set())
        setStatusMessage(items.length > 0 ? `Scan complete: ${items.length} candidates found` : 'Scan complete: no candidates found')
        if (items.length > 0) setActiveScreen('scanner')
      } else {
        setScanError(result.error || 'Scan failed. Please try again.')
        setStatusMessage('')
      }
    } catch (err: any) {
      setScanError(err.message || 'Scan failed')
      setStatusMessage('')
    } finally {
      setScanLoading(false)
    }
  }, [])

  const handleAnalyzeMargins = useCallback(async () => {
    const selected = candidates.filter((_, i) => selectedCandidates.has(i))
    if (selected.length === 0) return
    setAnalyzeLoading(true)
    setAnalyzeError('')
    setStatusMessage('Analyzing margins...')
    try {
      const itemList = selected
        .map((c) => `- ${c.item_name}: Current bid ${c.current_bid}, Condition: ${c.condition}, Source: ${c.source}, Estimated Value: ${c.estimated_value}`)
        .join('\n')
      const result = await callAIAgent(
        `Analyze the following auction items for flip margin potential. For each item, cross-reference against eBay sold listings, StockX prices, and Amazon marketplace pricing. Calculate ROI accounting for 15% buyer's premium and estimated shipping costs.\n\nItems to analyze:\n${itemList}`,
        AGENT_IDS.marketArbitrage
      )
      if (result.success && result.response) {
        const rawResult = result.response?.result || result.response
        const parsed = parseLLMJson(rawResult)
        const items = Array.isArray(parsed?.analyses) ? parsed.analyses : []
        setAnalyses(items)
        setAnalysisSummary(parsed?.summary || `Analyzed ${items.length} items`)
        setApprovedAnalyses(new Set())
        setStatusMessage(items.length > 0 ? `Analysis complete: ${items.length} items analyzed` : 'Analysis complete')
        if (items.length > 0) setActiveScreen('analysis')
      } else {
        setAnalyzeError(result.error || 'Analysis failed. Please try again.')
        setStatusMessage('')
      }
    } catch (err: any) {
      setAnalyzeError(err.message || 'Analysis failed')
      setStatusMessage('')
    } finally {
      setAnalyzeLoading(false)
    }
  }, [candidates, selectedCandidates])

  const handleGenerateListings = useCallback(async () => {
    const approved = analyses.filter((_, i) => approvedAnalyses.has(i))
    if (approved.length === 0) return
    setListingLoading(true)
    setListingError('')
    setStatusMessage('Generating listings...')
    try {
      const itemList = approved
        .map((a) => `- ${a.item_name}: Market price ${a.market_price}, ROI: ${a.roi_percentage}, Rating: ${a.roi_rating}`)
        .join('\n')
      const result = await callAIAgent(
        `Generate stealth Shopify listing drafts for the following approved items using 'Estate & Liquidation Specialists' branding. Position as premium estate/liquidation finds. NO mention of government, surplus, auction, GSA, or Treasury. Include 7-day processing language.\n\nItems:\n${itemList}`,
        AGENT_IDS.storefront
      )
      if (result.success && result.response) {
        const rawResult = result.response?.result || result.response
        const parsed = parseLLMJson(rawResult)
        const items = Array.isArray(parsed?.listings) ? parsed.listings : []
        setListings(items)
        setApprovedListings(new Set())
        setStatusMessage(items.length > 0 ? `Generated ${items.length} listing drafts` : 'Generation complete')
        if (items.length > 0) setActiveScreen('drafts')
      } else {
        setListingError(result.error || 'Listing generation failed. Please try again.')
        setStatusMessage('')
      }
    } catch (err: any) {
      setListingError(err.message || 'Listing generation failed')
      setStatusMessage('')
    } finally {
      setListingLoading(false)
    }
  }, [analyses, approvedAnalyses])

  const handleFindLocalLots = useCallback(async () => {
    setInspectionLoading(true)
    setInspectionError('')
    setStatusMessage('Searching for local lots...')
    try {
      const result = await callAIAgent(
        'Search all four auction sources (GSAAuctions.gov, Treasury.gov GP Auctions, AppleAuctioneering.com, USAAuctionOnline.com) for lots located within 100 miles of Panama City, FL (ZIP 32401). Generate item-specific inspection checklists including serial number verification for electronics, authenticity checks for luxury goods, and condition assessment criteria. Surface inspection day dates and location details.',
        AGENT_IDS.inspectionScheduler
      )
      if (result.success && result.response) {
        const rawResult = result.response?.result || result.response
        const parsed = parseLLMJson(rawResult)
        const items = Array.isArray(parsed?.local_lots) ? parsed.local_lots : []
        setLocalLots(items)
        setSelectedLot(0)
        setStatusMessage(items.length > 0 ? `Found ${items.length} local lots` : 'No local lots found')
        if (items.length > 0) setActiveScreen('inspections')
      } else {
        setInspectionError(result.error || 'Inspection search failed. Please try again.')
        setStatusMessage('')
      }
    } catch (err: any) {
      setInspectionError(err.message || 'Inspection search failed')
      setStatusMessage('')
    } finally {
      setInspectionLoading(false)
    }
  }, [])

  const handleBrowseInventory = useCallback(async () => {
    if (!inventoryUrl.trim() && !inventoryQuery.trim()) return
    setInventoryLoading(true)
    setInventoryError('')
    setStatusMessage('Browsing live inventory...')
    try {
      let message = ''
      if (inventoryUrl.trim()) {
        message = `Visit this specific URL and extract all inventory/listing data from the page: ${inventoryUrl.trim()}. For each item found, provide the item name, description, source URL, current price, condition, lot ID, availability status, category, any special notes, and whether it's time-sensitive. Structure everything as a clean inventory list.`
      } else {
        message = `Browse auction and inventory websites to find: ${inventoryQuery.trim()}. Search across GSAAuctions.gov, Treasury.gov, AppleAuctioneering.com, USAAuctionOnline.com, eBay, and other relevant marketplaces. Extract real-time listing data including prices, conditions, lot IDs, and availability. Flag any time-sensitive listings ending within 48 hours.`
      }
      const result = await callAIAgent(message, AGENT_IDS.liveInventory)
      if (result.success && result.response) {
        const rawResult = result.response?.result || result.response
        const parsed = parseLLMJson(rawResult)
        const items = Array.isArray(parsed?.items) ? parsed.items : []
        setInventoryItems(items)
        setInventorySummary(parsed?.summary || `Found ${items.length} items`)
        setInventorySitesVisited(Array.isArray(parsed?.sites_visited) ? parsed.sites_visited : [])
        setInventoryTimestamp(parsed?.access_timestamp || new Date().toISOString())
        setStatusMessage(items.length > 0 ? `Live scan: ${items.length} items found` : 'No items found')
        setActiveScreen('inventory')
      } else {
        setInventoryError(result.error || 'Live browse failed. Please try again.')
        setStatusMessage('')
      }
    } catch (err: any) {
      setInventoryError(err.message || 'Live browse failed')
      setStatusMessage('')
    } finally {
      setInventoryLoading(false)
    }
  }, [inventoryUrl, inventoryQuery])

  // ─── Selection Helpers ───
  const toggleCandidate = (idx: number) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      if (categoryFilter !== 'all' && c.category?.toLowerCase() !== categoryFilter) return false
      if (conditionFilter !== 'all' && c.condition?.toLowerCase() !== conditionFilter) return false
      return true
    })
  }, [candidates, sourceFilter, categoryFilter, conditionFilter])

  const toggleAllCandidates = () => {
    if (selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map((_, i) => i)))
    }
  }

  const toggleAnalysisApproval = (idx: number) => {
    setApprovedAnalyses((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleListingApproval = (idx: number) => {
    setApprovedListings((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const approveAllListings = () => {
    setApprovedListings(new Set(listings.map((_, i) => i)))
  }

  // ─── Priority Queue ───
  const addPriorityItem = () => {
    if (!newPriorityName.trim()) return
    const now = Date.now()
    setPriorityItems((prev) => [
      ...prev,
      {
        id: `PRI-${now}`,
        item_name: newPriorityName,
        customer_ref: newPriorityRef || `CUST-${Math.floor(Math.random() * 9000) + 1000}`,
        lot_id: newPriorityLot || 'TBD',
        status: 'Customer Purchased',
        created_at: now,
        hold_end: now + 7 * 24 * 60 * 60 * 1000,
      },
    ])
    setNewPriorityName('')
    setNewPriorityRef('')
    setNewPriorityLot('')
  }

  const advancePriorityStatus = (id: string) => {
    setPriorityItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const currentIdx = PRIORITY_STAGES.indexOf(item.status)
        if (currentIdx < PRIORITY_STAGES.length - 1) {
          return { ...item, status: PRIORITY_STAGES[currentIdx + 1] }
        }
        return item
      })
    )
  }

  const removePriorityItem = (id: string) => {
    setPriorityItems((prev) => prev.filter((p) => p.id !== id))
  }

  // ─── Checklist ───
  const toggleChecklistItem = (lotId: string, checkIdx: number) => {
    setCheckedItems((prev) => {
      const current = prev[lotId] || new Set<number>()
      const next = new Set(current)
      if (next.has(checkIdx)) next.delete(checkIdx)
      else next.add(checkIdx)
      return { ...prev, [lotId]: next }
    })
  }

  // ─── Listing Edit ───
  const startEditListing = (idx: number) => {
    setEditingListing(idx)
    setEditTitle(listings[idx].product_title)
    setEditDescription(listings[idx].description)
  }

  const saveEditListing = () => {
    if (editingListing === null) return
    setListings((prev) =>
      prev.map((l, i) =>
        i === editingListing ? { ...l, product_title: editTitle, description: editDescription } : l
      )
    )
    setEditingListing(null)
  }

  const uniqueSources = useMemo(() => [...new Set(candidates.map((c) => c.source).filter(Boolean))], [candidates])
  const uniqueCategories = useMemo(() => [...new Set(candidates.map((c) => c.category?.toLowerCase()).filter(Boolean))], [candidates])
  const uniqueConditions = useMemo(() => [...new Set(candidates.map((c) => c.condition?.toLowerCase()).filter(Boolean))], [candidates])

  const navItems: { id: Screen; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <HiOutlineHome className="w-5 h-5" /> },
    { id: 'scanner', label: 'Auction Scanner', icon: <HiOutlineMagnifyingGlass className="w-5 h-5" />, badge: candidates.length || undefined },
    { id: 'analysis', label: 'Margin Analysis', icon: <HiOutlineChartBarSquare className="w-5 h-5" />, badge: analyses.length || undefined },
    { id: 'drafts', label: 'Listing Drafts', icon: <HiOutlineDocumentText className="w-5 h-5" />, badge: listings.length || undefined },
    { id: 'inspections', label: 'Local Inspections', icon: <HiOutlineMapPin className="w-5 h-5" />, badge: localLots.length || undefined },
    { id: 'inventory', label: 'Live Inventory', icon: <HiOutlineGlobeAlt className="w-5 h-5" />, badge: inventoryItems.length || undefined },
    { id: 'priority', label: 'Priority Queue', icon: <HiOutlineFlag className="w-5 h-5" />, badge: priorityItems.length || undefined },
  ]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground" style={{ letterSpacing: '0.01em' }}>
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 border-r flex flex-col transition-all duration-300`}
        style={{ background: 'hsl(20, 28%, 6%)', borderColor: 'hsl(20, 18%, 12%)' }}
      >
        <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: 'hsl(20, 18%, 12%)' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'hsl(36, 60%, 31%)' }}
          >
            <HiOutlineArchiveBox className="w-6 h-6" />
          </button>
          {sidebarOpen && (
            <span className="text-lg font-semibold tracking-wide text-foreground">Recovery Hub</span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                activeScreen === item.id
                  ? 'text-white'
                  : 'hover:text-foreground'
              }`}
              style={
                activeScreen === item.id
                  ? { background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }
                  : { color: 'hsl(35, 15%, 55%)' }
              }
            >
              {item.icon}
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(20, 18%, 15%)', color: 'hsl(35, 15%, 55%)' }}>
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t" style={{ borderColor: 'hsl(20, 18%, 12%)' }}>
            <div className="text-xs text-muted-foreground">Estate & Liquidation Specialists</div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border" style={{ background: 'hsl(20, 25%, 6%)' }}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-wide">
              {navItems.find((n) => n.id === activeScreen)?.label || 'Dashboard'}
            </h1>
            {statusMessage && <span className="text-sm text-muted-foreground">{statusMessage}</span>}
          </div>
          <div className="flex items-center gap-3">
            {activeScreen === 'dashboard' && (
              <>
                <Button
                  onClick={handleScanAuctions}
                  disabled={scanLoading}
                  className="border-0"
                  style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}
                >
                  {scanLoading ? <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" /> : <HiOutlineMagnifyingGlass className="w-4 h-4 mr-2" />}
                  Scan Auctions
                </Button>
                <Button onClick={handleFindLocalLots} disabled={inspectionLoading} variant="secondary" className="border border-border">
                  {inspectionLoading ? <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" /> : <HiOutlineMapPin className="w-4 h-4 mr-2" />}
                  Find Local Lots
                </Button>
                <Button onClick={() => setActiveScreen('inventory')} variant="secondary" className="border border-border">
                  <HiOutlineGlobeAlt className="w-4 h-4 mr-2" />
                  Live Inventory
                </Button>
              </>
            )}
            {activeScreen === 'scanner' && (
              <Button
                onClick={handleAnalyzeMargins}
                disabled={analyzeLoading || selectedCandidates.size === 0}
                className="border-0"
                style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}
              >
                {analyzeLoading ? <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" /> : <HiOutlineChartBarSquare className="w-4 h-4 mr-2" />}
                Analyze Margins ({selectedCandidates.size})
              </Button>
            )}
            {activeScreen === 'analysis' && (
              <Button
                onClick={handleGenerateListings}
                disabled={listingLoading || approvedAnalyses.size === 0}
                className="border-0"
                style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}
              >
                {listingLoading ? <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" /> : <HiOutlineDocumentText className="w-4 h-4 mr-2" />}
                Generate Listings ({approvedAnalyses.size})
              </Button>
            )}
            {activeScreen === 'inventory' && (
              <Button
                onClick={handleBrowseInventory}
                disabled={inventoryLoading || (!inventoryUrl.trim() && !inventoryQuery.trim())}
                className="border-0"
                style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}
              >
                {inventoryLoading ? <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" /> : <HiOutlineGlobeAlt className="w-4 h-4 mr-2" />}
                Browse Inventory
              </Button>
            )}
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* ─── DASHBOARD ─── */}
            {activeScreen === 'dashboard' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Lots Scanned', value: stats.lotsScanned, icon: <HiOutlineMagnifyingGlass className="w-6 h-6" />, sub: '4 sources monitored', subIcon: <HiOutlineArrowTrendingUp className="w-3 h-3 text-green-400" /> },
                    { label: 'Items Analyzed', value: stats.itemsAnalyzed, icon: <HiOutlineChartBarSquare className="w-6 h-6" />, sub: '3 marketplaces cross-referenced', subIcon: <HiOutlineArrowTrendingUp className="w-3 h-3 text-green-400" /> },
                    { label: 'Drafts Pending', value: stats.draftsPending, icon: <HiOutlineDocumentText className="w-6 h-6" />, sub: 'Awaiting review', subIcon: <HiOutlineClock className="w-3 h-3 text-amber-400" /> },
                    { label: 'Priority Flags', value: stats.priorityFlags, icon: <HiOutlineFlag className="w-6 h-6 text-red-400" />, sub: 'Requiring action', subIcon: <HiOutlineBolt className="w-3 h-3 text-red-400" /> },
                  ].map((kpi) => (
                    <Card key={kpi.label} className="border border-border shadow-sm">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{kpi.label}</p>
                            <p className="text-3xl font-semibold mt-1">{kpi.value}</p>
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'hsl(20, 18%, 12%)' }}>
                            <span style={{ color: 'hsl(36, 60%, 31%)' }}>{kpi.icon}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                          {kpi.subIcon}
                          <span>{kpi.sub}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Error alerts */}
                {scanError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', borderColor: 'hsl(0, 63%, 31%)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{scanError}</span>
                    <Button variant="ghost" size="sm" onClick={handleScanAuctions}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}
                {inspectionError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{inspectionError}</span>
                    <Button variant="ghost" size="sm" onClick={handleFindLocalLots}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}

                {/* Loading */}
                {scanLoading && (
                  <Card className="border border-border">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <HiOutlineArrowPath className="w-4 h-4 animate-spin" style={{ color: 'hsl(36, 60%, 31%)' }} />
                        Scanning Auctions...
                      </CardTitle>
                    </CardHeader>
                    <CardContent><TableSkeleton rows={4} cols={5} /></CardContent>
                  </Card>
                )}
                {inspectionLoading && (
                  <Card className="border border-border">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <HiOutlineArrowPath className="w-4 h-4 animate-spin" style={{ color: 'hsl(36, 60%, 31%)' }} />
                        Searching Local Lots...
                      </CardTitle>
                    </CardHeader>
                    <CardContent><TableSkeleton rows={3} cols={4} /></CardContent>
                  </Card>
                )}

                {/* Two-column */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Candidates */}
                  <Card className="border border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Recent Candidates</CardTitle>
                        <CardDescription className="text-xs">Latest scanned items</CardDescription>
                      </div>
                      {candidates.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setActiveScreen('scanner')} style={{ color: 'hsl(36, 60%, 31%)' }}>
                          View All <HiOutlineChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {candidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <HiOutlineMagnifyingGlass className="w-10 h-10 mb-3 opacity-40" />
                          <p className="text-sm">No candidates yet</p>
                          <p className="text-xs mt-1">Run your first scan to find opportunities</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {candidates.slice(0, 10).map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{ background: 'hsl(20, 18%, 10%)' }}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.item_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{c.source} &middot; {c.category}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-3">
                                <p className="text-sm font-medium" style={{ color: 'hsl(36, 60%, 31%)' }}>{c.current_bid}</p>
                                <Badge variant="outline" className="text-xs mt-0.5">{c.condition}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Priority Queue Preview */}
                  <Card className="border border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Priority Queue</CardTitle>
                        <CardDescription className="text-xs">Customer purchases needing action</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveScreen('priority')} style={{ color: 'hsl(36, 60%, 31%)' }}>
                        Manage <HiOutlineChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {priorityItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <HiOutlineFlag className="w-10 h-10 mb-3 opacity-40" />
                          <p className="text-sm">No priority items</p>
                          <p className="text-xs mt-1">Items appear when customers purchase</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {priorityItems.slice(0, 5).map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'hsl(20, 18%, 10%)' }}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.item_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{p.customer_ref}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <Badge variant="outline" className={`text-xs ${STAGE_COLORS[p.status] || ''}`}>{p.status}</Badge>
                                <span className="text-xs text-muted-foreground">{formatCountdown(p.hold_end)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Pipeline Progress */}
                {(candidates.length > 0 || analyses.length > 0 || listings.length > 0) && (
                  <Card className="border border-border shadow-sm">
                    <CardHeader><CardTitle className="text-base">Pipeline Progress</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {[
                          { count: candidates.length, label: 'Scanned', screen: 'scanner' as Screen },
                          { count: analyses.length, label: 'Analyzed', screen: 'analysis' as Screen },
                          { count: listings.length, label: 'Drafted', screen: 'drafts' as Screen },
                          { count: approvedListings.size, label: 'Approved', screen: 'drafts' as Screen },
                        ].map((step, si) => (
                          <div key={step.label} className="contents">
                            {si > 0 && <HiOutlineChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                            <div
                              className="flex-1 p-3 rounded-lg text-center cursor-pointer transition-colors border"
                              style={step.count > 0 ? { background: 'rgba(127, 85, 26, 0.15)', borderColor: 'hsl(36, 60%, 31%)' } : { background: 'hsl(20, 18%, 15%)', borderColor: 'hsl(20, 18%, 16%)' }}
                              onClick={() => step.count > 0 && setActiveScreen(step.screen)}
                            >
                              <p className="text-lg font-semibold">{step.count}</p>
                              <p className="text-xs text-muted-foreground">{step.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ─── AUCTION SCANNER ─── */}
            {activeScreen === 'scanner' && (
              <div className="space-y-4">
                {scanSummary && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(127, 85, 26, 0.1)', border: '1px solid rgba(127, 85, 26, 0.3)' }}>
                    <HiOutlineShieldCheck className="w-4 h-4 inline mr-2" style={{ color: 'hsl(36, 60%, 31%)' }} />
                    {scanSummary}
                  </div>
                )}

                {scanError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{scanError}</span>
                    <Button variant="ghost" size="sm" onClick={handleScanAuctions}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}

                {/* Filters */}
                <Card className="border border-border">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <HiOutlineFunnel className="w-4 h-4 text-muted-foreground" />
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="w-44 h-9 bg-input border-border"><SelectValue placeholder="All Sources" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          {uniqueSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-40 h-9 bg-input border-border"><SelectValue placeholder="All Categories" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {uniqueCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={conditionFilter} onValueChange={setConditionFilter}>
                        <SelectTrigger className="w-40 h-9 bg-input border-border"><SelectValue placeholder="All Conditions" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Conditions</SelectItem>
                          {uniqueConditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" onClick={handleScanAuctions} disabled={scanLoading} style={{ color: 'hsl(36, 60%, 31%)' }}>
                        <HiOutlineArrowPath className={`w-4 h-4 mr-1 ${scanLoading ? 'animate-spin' : ''}`} /> Rescan
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {scanLoading && <TableSkeleton rows={6} cols={7} />}

                {!scanLoading && filteredCandidates.length === 0 && candidates.length === 0 && (
                  <Card className="border border-border">
                    <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                      <HiOutlineMagnifyingGlass className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-base font-medium">No candidates yet</p>
                      <p className="text-sm mt-1">Click &quot;Scan Auctions&quot; to find opportunities</p>
                    </CardContent>
                  </Card>
                )}

                {!scanLoading && filteredCandidates.length === 0 && candidates.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="py-8 flex flex-col items-center text-muted-foreground">
                      <HiOutlineFunnel className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm">No items match current filters</p>
                    </CardContent>
                  </Card>
                )}

                {!scanLoading && filteredCandidates.length > 0 && (
                  <Card className="border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border" style={{ background: 'hsl(20, 18%, 10%)' }}>
                            <th className="p-3 text-left w-10">
                              <button onClick={toggleAllCandidates} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0 ? '' : 'border-border'}`} style={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0 ? { background: 'hsl(36, 60%, 31%)', borderColor: 'hsl(36, 60%, 31%)' } : {}}>
                                {selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0 && <HiOutlineCheck className="w-3 h-3 text-white" />}
                              </button>
                            </th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Item</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Source</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Category</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Condition</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Bid</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Est. Value</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Flags</th>
                            <th className="p-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCandidates.map((c, i) => (
                            <Fragment key={i}>
                              <tr className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${selectedCandidates.has(i) ? 'bg-amber-900/5' : ''}`}>
                                <td className="p-3">
                                  <button onClick={() => toggleCandidate(i)} className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={selectedCandidates.has(i) ? { background: 'hsl(36, 60%, 31%)', borderColor: 'hsl(36, 60%, 31%)' } : { borderColor: 'hsl(20, 18%, 16%)' }}>
                                    {selectedCandidates.has(i) && <HiOutlineCheck className="w-3 h-3 text-white" />}
                                  </button>
                                </td>
                                <td className="p-3"><p className="font-medium truncate max-w-[200px]">{c.item_name}</p></td>
                                <td className="p-3 text-muted-foreground text-xs">{c.source}</td>
                                <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{c.category}</Badge></td>
                                <td className="p-3"><Badge variant="outline" className={`text-xs ${(c.condition || '').toLowerCase().includes('new') ? 'border-green-700 text-green-300' : ''}`}>{c.condition}</Badge></td>
                                <td className="p-3 text-right font-medium">{c.current_bid}</td>
                                <td className="p-3 text-right" style={{ color: 'hsl(36, 60%, 31%)' }}>{c.estimated_value}</td>
                                <td className="p-3">
                                  {Array.isArray(c.flags) && c.flags.map((f, fi) => (
                                    <Badge key={fi} variant="outline" className="text-xs mr-1" style={{ borderColor: 'hsl(36, 60%, 31%)', color: 'hsl(36, 60%, 31%)' }}>{f}</Badge>
                                  ))}
                                </td>
                                <td className="p-3">
                                  <button onClick={() => setExpandedCandidate(expandedCandidate === i ? null : i)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    {expandedCandidate === i ? <HiOutlineChevronDown className="w-4 h-4" /> : <HiOutlineChevronRight className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>
                              {expandedCandidate === i && (
                                <tr className="border-b border-border/50">
                                  <td colSpan={9} className="p-4" style={{ background: 'hsl(20, 18%, 8%)' }}>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground text-xs">Description</span>
                                        <p className="mt-1">{c.description}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs">Lot ID</span>
                                        <p className="mt-1 font-mono text-xs">{c.lot_id}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs">Auction End</span>
                                        <p className="mt-1">{c.auction_end_date}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ─── MARGIN ANALYSIS ─── */}
            {activeScreen === 'analysis' && (
              <div className="space-y-4">
                {analysisSummary && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(127, 85, 26, 0.1)', border: '1px solid rgba(127, 85, 26, 0.3)' }}>
                    <HiOutlineChartBarSquare className="w-4 h-4 inline mr-2" style={{ color: 'hsl(36, 60%, 31%)' }} />
                    {analysisSummary}
                  </div>
                )}

                {analyzeError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{analyzeError}</span>
                    <Button variant="ghost" size="sm" onClick={handleAnalyzeMargins}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}

                {analyzeLoading && <TableSkeleton rows={5} cols={8} />}

                {!analyzeLoading && analyses.length === 0 && (
                  <Card className="border border-border">
                    <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                      <HiOutlineChartBarSquare className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-base font-medium">No analyses yet</p>
                      <p className="text-sm mt-1">Select candidates and click &quot;Analyze Margins&quot;</p>
                    </CardContent>
                  </Card>
                )}

                {!analyzeLoading && analyses.length > 0 && (
                  <Card className="border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border" style={{ background: 'hsl(20, 18%, 10%)' }}>
                            <th className="p-3 w-10"><HiOutlineCheck className="w-4 h-4 text-muted-foreground" /></th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Item</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Auction</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Market</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Premium</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Ship</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Fees</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Profit</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">ROI%</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Rating</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Risks</th>
                            <th className="p-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {analyses.map((a, i) => (
                            <Fragment key={i}>
                              <tr className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${approvedAnalyses.has(i) ? 'bg-green-900/5' : ''}`}>
                                <td className="p-3">
                                  <button onClick={() => toggleAnalysisApproval(i)} className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={approvedAnalyses.has(i) ? { background: '#16a34a', borderColor: '#16a34a' } : { borderColor: 'hsl(20, 18%, 16%)' }}>
                                    {approvedAnalyses.has(i) && <HiOutlineCheck className="w-3 h-3 text-white" />}
                                  </button>
                                </td>
                                <td className="p-3 font-medium truncate max-w-[160px]">{a.item_name}</td>
                                <td className="p-3 text-right text-muted-foreground">{a.auction_price}</td>
                                <td className="p-3 text-right">{a.market_price}</td>
                                <td className="p-3 text-right text-muted-foreground text-xs">{a.buyer_premium}</td>
                                <td className="p-3 text-right text-muted-foreground text-xs">{a.shipping_estimate}</td>
                                <td className="p-3 text-right text-muted-foreground text-xs">{a.platform_fees}</td>
                                <td className="p-3 text-right font-semibold text-green-400">{a.net_profit}</td>
                                <td className={`p-3 text-right font-semibold ${getRoiColor(a.roi_rating)}`}>{a.roi_percentage}</td>
                                <td className="p-3"><Badge variant="outline" className={`text-xs ${getRoiBadge(a.roi_rating)}`}>{a.roi_rating}</Badge></td>
                                <td className="p-3">
                                  {Array.isArray(a.risk_flags) && a.risk_flags.length > 0 ? (
                                    <Badge variant="outline" className="text-xs border-red-700 text-red-300"><HiOutlineExclamationTriangle className="w-3 h-3 mr-1" />{a.risk_flags.length}</Badge>
                                  ) : (
                                    <span className="text-xs text-green-400">Clear</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <button onClick={() => setExpandedAnalysis(expandedAnalysis === i ? null : i)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    {expandedAnalysis === i ? <HiOutlineChevronDown className="w-4 h-4" /> : <HiOutlineChevronRight className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>
                              {expandedAnalysis === i && (
                                <tr className="border-b border-border/50">
                                  <td colSpan={12} className="p-4" style={{ background: 'hsl(20, 18%, 8%)' }}>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground text-xs">Recommendation</span>
                                        <p className="mt-1">{a.recommendation}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs">Comparable Sales</span>
                                        <ul className="mt-1 space-y-1">
                                          {Array.isArray(a.comparable_sales) && a.comparable_sales.map((cs, ci) => <li key={ci} className="text-xs text-muted-foreground">{cs}</li>)}
                                        </ul>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs">Risk Details</span>
                                        <ul className="mt-1 space-y-1">
                                          {Array.isArray(a.risk_flags) && a.risk_flags.map((rf, ri) => (
                                            <li key={ri} className="text-xs text-red-400 flex items-center gap-1"><HiOutlineExclamationTriangle className="w-3 h-3" />{rf}</li>
                                          ))}
                                          {(!Array.isArray(a.risk_flags) || a.risk_flags.length === 0) && <li className="text-xs text-green-400">No risks identified</li>}
                                        </ul>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ─── LISTING DRAFTS ─── */}
            {activeScreen === 'drafts' && (
              <div className="space-y-4">
                {listingError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{listingError}</span>
                    <Button variant="ghost" size="sm" onClick={handleGenerateListings}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}

                {listingLoading && <CardSkeleton count={3} />}

                {!listingLoading && listings.length === 0 && (
                  <Card className="border border-border">
                    <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                      <HiOutlineDocumentText className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-base font-medium">No listing drafts yet</p>
                      <p className="text-sm mt-1">Approve items in Margin Analysis and click &quot;Generate Listings&quot;</p>
                    </CardContent>
                  </Card>
                )}

                {!listingLoading && listings.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{approvedListings.size} of {listings.length} approved</p>
                      <Button variant="secondary" size="sm" onClick={approveAllListings} className="border border-border">
                        <HiOutlineCheck className="w-4 h-4 mr-1" /> Approve All
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {listings.map((l, i) => (
                        <Card key={i} className={`shadow-sm transition-colors ${approvedListings.has(i) ? 'border-green-700/50' : 'border-border'}`} style={approvedListings.has(i) ? { background: 'rgba(20, 83, 45, 0.05)' } : {}}>
                          <CardHeader className="pb-3">
                            {editingListing === i ? (
                              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-input border-border font-medium" />
                            ) : (
                              <CardTitle className="text-base leading-snug">{l.product_title}</CardTitle>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs capitalize">{l.category}</Badge>
                              {approvedListings.has(i) && <Badge className="bg-green-900/40 text-green-300 border border-green-700 text-xs"><HiOutlineCheck className="w-3 h-3 mr-1" />Approved</Badge>}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            {editingListing === i ? (
                              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full h-32 p-3 bg-input border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                            ) : (
                              <p className="text-muted-foreground text-xs leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.description}</p>
                            )}
                            <Separator />
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-lg font-semibold" style={{ color: 'hsl(36, 60%, 31%)' }}>{l.suggested_price}</span>
                                <span className="text-xs text-muted-foreground line-through ml-2">{l.compare_at_price}</span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground"><p>{l.condition_description}</p></div>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(l.tags) && l.tags.slice(0, 4).map((tag, ti) => (
                                <Badge key={ti} variant="outline" className="text-xs px-2 py-0"><HiOutlineTag className="w-3 h-3 mr-1" />{tag}</Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground p-2 rounded" style={{ background: 'hsl(20, 18%, 10%)' }}>
                              <HiOutlineClock className="w-3 h-3 inline mr-1" />
                              {l.processing_note || 'Ships within 7-10 business days after quality verification'}
                            </div>
                          </CardContent>
                          <CardFooter className="gap-2">
                            {editingListing === i ? (
                              <>
                                <Button size="sm" onClick={saveEditListing} style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}>
                                  <HiOutlineCheck className="w-4 h-4 mr-1" /> Save
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingListing(null)}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Button variant="secondary" size="sm" onClick={() => startEditListing(i)} className="border border-border">
                                  <HiOutlinePencilSquare className="w-4 h-4 mr-1" /> Edit
                                </Button>
                                <Button size="sm" onClick={() => toggleListingApproval(i)} style={approvedListings.has(i) ? { background: '#15803d', color: 'white' } : { background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}>
                                  {approvedListings.has(i) ? <><HiOutlineCheck className="w-4 h-4 mr-1" /> Approved</> : <><HiOutlineShieldCheck className="w-4 h-4 mr-1" /> Approve</>}
                                </Button>
                              </>
                            )}
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── LOCAL INSPECTIONS ─── */}
            {activeScreen === 'inspections' && (
              <div className="space-y-4">
                {inspectionError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{inspectionError}</span>
                    <Button variant="ghost" size="sm" onClick={handleFindLocalLots}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}

                {inspectionLoading && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1"><TableSkeleton rows={4} cols={2} /></div>
                    <div className="lg:col-span-2"><CardSkeleton count={1} /></div>
                  </div>
                )}

                {!inspectionLoading && localLots.length === 0 && (
                  <Card className="border border-border">
                    <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                      <HiOutlineMapPin className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-base font-medium">No local lots found</p>
                      <p className="text-sm mt-1">Click &quot;Find Local Lots&quot; to search within 100mi of Panama City</p>
                    </CardContent>
                  </Card>
                )}

                {!inspectionLoading && localLots.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">{localLots.length} lots within 100mi of Panama City, FL</p>
                      {localLots.map((lot, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedLot(i)}
                          className="w-full text-left p-4 rounded-lg border transition-colors"
                          style={selectedLot === i ? { borderColor: 'hsl(36, 60%, 31%)', background: 'rgba(127, 85, 26, 0.1)' } : { borderColor: 'hsl(20, 18%, 16%)', background: 'hsl(20, 25%, 7%)' }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{lot.item_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{lot.source}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs"><HiOutlineMapPin className="w-3 h-3 mr-1" />{lot.distance_miles} mi</Badge>
                                <Badge variant="outline" className="text-xs capitalize">{lot.category}</Badge>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-sm font-medium" style={{ color: 'hsl(36, 60%, 31%)' }}>{lot.current_bid}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <HiOutlineClock className="w-3 h-3" />{lot.inspection_dates}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="lg:col-span-2">
                      {localLots[selectedLot] && (
                        <Card className="border border-border sticky top-0">
                          <CardHeader>
                            <CardTitle className="text-base">{localLots[selectedLot].item_name}</CardTitle>
                            <CardDescription className="flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1"><HiOutlineMapPin className="w-3 h-3" />{localLots[selectedLot].location}</span>
                              <span className="flex items-center gap-1"><HiOutlineClock className="w-3 h-3" />{localLots[selectedLot].inspection_dates}</span>
                              <span className="font-mono text-xs">Lot: {localLots[selectedLot].lot_id}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <HiOutlineClipboardDocumentCheck className="w-4 h-4" style={{ color: 'hsl(36, 60%, 31%)' }} />
                              Inspection Checklist
                            </h4>
                            <div className="space-y-2">
                              {Array.isArray(localLots[selectedLot].checklist) && localLots[selectedLot].checklist.map((item: string, ci: number) => {
                                const lotKey = localLots[selectedLot].lot_id
                                const isChecked = checkedItems[lotKey]?.has(ci) || false
                                return (
                                  <button
                                    key={ci}
                                    onClick={() => toggleChecklistItem(lotKey, ci)}
                                    className="w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left border"
                                    style={isChecked ? { background: 'rgba(20, 83, 45, 0.1)', borderColor: 'rgba(20, 83, 45, 0.3)' } : { background: 'hsl(20, 18%, 10%)', borderColor: 'hsl(20, 18%, 16%)' }}
                                  >
                                    <div className="w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors" style={isChecked ? { background: '#16a34a', borderColor: '#16a34a' } : { borderColor: 'hsl(20, 18%, 16%)' }}>
                                      {isChecked && <HiOutlineCheck className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                                  </button>
                                )
                              })}
                            </div>
                            {Array.isArray(localLots[selectedLot].checklist) && (
                              <div className="mt-4 text-xs text-muted-foreground">
                                {checkedItems[localLots[selectedLot].lot_id]?.size || 0} of {localLots[selectedLot].checklist.length} items checked
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── LIVE INVENTORY ─── */}
            {activeScreen === 'inventory' && (
              <div className="space-y-4">
                {/* Search Controls */}
                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <HiOutlineGlobeAlt className="w-4 h-4" style={{ color: 'hsl(36, 60%, 31%)' }} />
                      Live Inventory Browser
                    </CardTitle>
                    <CardDescription className="text-xs">Enter a direct URL to scrape or search across auction marketplaces</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Direct URL</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <HiOutlineLink className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="https://gsaauctions.gov/listing/..."
                              value={inventoryUrl}
                              onChange={(e) => setInventoryUrl(e.target.value)}
                              className="bg-input border-border pl-9"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Separator className="flex-1" />
                        <span className="text-xs text-muted-foreground">or search by keyword</span>
                        <Separator className="flex-1" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Search Query</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <HiOutlineMagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="e.g., Apple MacBook Pro M3, Rolex Submariner, DJI Drone"
                              value={inventoryQuery}
                              onChange={(e) => setInventoryQuery(e.target.value)}
                              className="bg-input border-border pl-9"
                            />
                          </div>
                          <Button
                            onClick={handleBrowseInventory}
                            disabled={inventoryLoading || (!inventoryUrl.trim() && !inventoryQuery.trim())}
                            style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}
                          >
                            {inventoryLoading ? <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" /> : <HiOutlineSignal className="w-4 h-4 mr-2" />}
                            {inventoryLoading ? 'Browsing...' : 'Browse'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {inventoryError && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid hsl(0, 63%, 31%)', color: '#fca5a5' }}>
                    <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{inventoryError}</span>
                    <Button variant="ghost" size="sm" onClick={handleBrowseInventory}><HiOutlineArrowPath className="w-4 h-4 mr-1" /> Retry</Button>
                  </div>
                )}

                {inventoryLoading && <TableSkeleton rows={6} cols={6} />}

                {/* Summary Bar */}
                {!inventoryLoading && inventoryItems.length > 0 && (
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {inventorySummary && (
                        <div className="p-3 rounded-lg text-sm flex-1" style={{ background: 'rgba(127, 85, 26, 0.1)', border: '1px solid rgba(127, 85, 26, 0.3)' }}>
                          <HiOutlineSignal className="w-4 h-4 inline mr-2" style={{ color: 'hsl(36, 60%, 31%)' }} />
                          {inventorySummary}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {inventoryTimestamp && (
                        <span className="flex items-center gap-1"><HiOutlineClock className="w-3 h-3" />{new Date(inventoryTimestamp).toLocaleString()}</span>
                      )}
                      {inventorySitesVisited.length > 0 && (
                        <span className="flex items-center gap-1"><HiOutlineGlobeAlt className="w-3 h-3" />{inventorySitesVisited.length} sites visited</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Sites Visited */}
                {!inventoryLoading && inventorySitesVisited.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {inventorySitesVisited.map((site, si) => (
                      <Badge key={si} variant="outline" className="text-xs"><HiOutlineGlobeAlt className="w-3 h-3 mr-1" />{site}</Badge>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!inventoryLoading && inventoryItems.length === 0 && !inventoryError && (
                  <Card className="border border-border">
                    <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                      <HiOutlineGlobeAlt className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-base font-medium">No inventory data yet</p>
                      <p className="text-sm mt-1">Enter a URL or search query and click &quot;Browse&quot; to scan live listings</p>
                    </CardContent>
                  </Card>
                )}

                {/* Results Table */}
                {!inventoryLoading && inventoryItems.length > 0 && (
                  <Card className="border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border" style={{ background: 'hsl(20, 18%, 10%)' }}>
                            <th className="p-3 text-left font-medium text-muted-foreground">Item</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Category</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Condition</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Price</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Availability</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Lot ID</th>
                            <th className="p-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryItems.map((item, i) => (
                            <Fragment key={i}>
                              <tr className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${item.time_sensitive ? 'bg-red-900/5' : ''}`}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium truncate max-w-[220px]">{item.item_name}</p>
                                    {item.time_sensitive && (
                                      <Badge variant="outline" className="text-xs border-red-700 text-red-300 flex-shrink-0">
                                        <HiOutlineBolt className="w-3 h-3 mr-1" />Urgent
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{item.category}</Badge></td>
                                <td className="p-3">
                                  <Badge variant="outline" className={`text-xs ${(item.condition || '').toLowerCase().includes('new') ? 'border-green-700 text-green-300' : ''}`}>
                                    {item.condition}
                                  </Badge>
                                </td>
                                <td className="p-3 text-right font-medium" style={{ color: 'hsl(36, 60%, 31%)' }}>{item.current_price}</td>
                                <td className="p-3">
                                  <Badge variant="outline" className={`text-xs ${
                                    (item.availability || '').toLowerCase().includes('available')
                                      ? 'border-green-700 text-green-300'
                                      : (item.availability || '').toLowerCase().includes('ending')
                                      ? 'border-amber-700 text-amber-300'
                                      : ''
                                  }`}>
                                    {item.availability}
                                  </Badge>
                                </td>
                                <td className="p-3 text-muted-foreground font-mono text-xs">{item.lot_id}</td>
                                <td className="p-3">
                                  <button onClick={() => setExpandedInventory(expandedInventory === i ? null : i)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    {expandedInventory === i ? <HiOutlineChevronDown className="w-4 h-4" /> : <HiOutlineChevronRight className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>
                              {expandedInventory === i && (
                                <tr className="border-b border-border/50">
                                  <td colSpan={7} className="p-4" style={{ background: 'hsl(20, 18%, 8%)' }}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground text-xs">Description</span>
                                        <p className="mt-1">{item.description}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs">Source URL</span>
                                        <p className="mt-1 text-xs font-mono break-all" style={{ color: 'hsl(36, 60%, 31%)' }}>
                                          <HiOutlineLink className="w-3 h-3 inline mr-1" />
                                          {item.source_url}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs">Special Notes</span>
                                        <p className={`mt-1 text-xs ${item.special_notes ? '' : 'text-muted-foreground'}`}>
                                          {item.special_notes || 'No special notes'}
                                        </p>
                                        {item.time_sensitive && (
                                          <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                                            <HiOutlineBolt className="w-3 h-3" />
                                            Time-sensitive listing - act fast
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ─── PRIORITY QUEUE ─── */}
            {activeScreen === 'priority' && (
              <div className="space-y-4">
                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <HiOutlineBolt className="w-4 h-4" style={{ color: 'hsl(36, 60%, 31%)' }} />
                      Add Priority Item
                    </CardTitle>
                    <CardDescription className="text-xs">Flag a customer purchase for auction priority tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-muted-foreground mb-1 block">Item Name</label>
                        <Input placeholder="e.g., Apple MacBook Pro M3" value={newPriorityName} onChange={(e) => setNewPriorityName(e.target.value)} className="bg-input border-border" />
                      </div>
                      <div className="w-40">
                        <label className="text-xs text-muted-foreground mb-1 block">Customer Ref</label>
                        <Input placeholder="CUST-0001" value={newPriorityRef} onChange={(e) => setNewPriorityRef(e.target.value)} className="bg-input border-border" />
                      </div>
                      <div className="w-40">
                        <label className="text-xs text-muted-foreground mb-1 block">Lot ID</label>
                        <Input placeholder="LOT-12345" value={newPriorityLot} onChange={(e) => setNewPriorityLot(e.target.value)} className="bg-input border-border" />
                      </div>
                      <Button onClick={addPriorityItem} disabled={!newPriorityName.trim()} style={{ background: 'hsl(36, 60%, 31%)', color: 'hsl(35, 20%, 95%)' }}>
                        <HiOutlineFlag className="w-4 h-4 mr-1" /> Add to Queue
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {PRIORITY_STAGES.map((stage) => (
                    <Badge key={stage} variant="outline" className={`text-xs ${STAGE_COLORS[stage] || ''}`}>{stage}</Badge>
                  ))}
                </div>

                {priorityItems.length === 0 ? (
                  <Card className="border border-border">
                    <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                      <HiOutlineFlag className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-base font-medium">No priority items</p>
                      <p className="text-sm mt-1">Add items when customers make purchases to track through fulfillment</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border" style={{ background: 'hsl(20, 18%, 10%)' }}>
                            <th className="p-3 text-left font-medium text-muted-foreground">Item</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Customer</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Lot</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Hold Timer</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {priorityItems.map((p) => {
                            const currentIdx = PRIORITY_STAGES.indexOf(p.status)
                            const isLast = currentIdx === PRIORITY_STAGES.length - 1
                            return (
                              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="p-3 font-medium">{p.item_name}</td>
                                <td className="p-3 text-muted-foreground font-mono text-xs">{p.customer_ref}</td>
                                <td className="p-3 text-muted-foreground font-mono text-xs">{p.lot_id}</td>
                                <td className="p-3"><Badge variant="outline" className={`text-xs ${STAGE_COLORS[p.status] || ''}`}>{p.status}</Badge></td>
                                <td className="p-3">
                                  <span className={`text-sm font-mono ${p.hold_end - Date.now() < 86400000 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                    {formatCountdown(p.hold_end)}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {!isLast && (
                                      <Button variant="ghost" size="sm" onClick={() => advancePriorityStatus(p.id)} style={{ color: 'hsl(36, 60%, 31%)' }}>
                                        <HiOutlineChevronRight className="w-4 h-4 mr-1" /> Advance
                                      </Button>
                                    )}
                                    {isLast && (
                                      <Badge className="bg-green-900/40 text-green-300 border border-green-700 text-xs"><HiOutlineCheck className="w-3 h-3 mr-1" /> Complete</Badge>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => removePriorityItem(p.id)} className="text-red-400 hover:text-red-300">
                                      <HiOutlineXMark className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}

