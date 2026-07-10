import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Upload, Download, Trash2, FileText, File } from 'lucide-react'

export default function Documents({ launchId }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('General')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', launchId],
    queryFn: () => api.get(`/launches/${launchId}/documents`).then(r => r.data)
  })

  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post(`/launches/${launchId}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries(['documents', launchId]); toast.success('Document uploaded'); setUploading(false) },
    onError: () => { toast.error('Failed to upload document'); setUploading(false) }
  })

  const deleteMutation = useMutation({
    mutationFn: (docId) => api.delete(`/launches/${launchId}/documents/${docId}`),
    onSuccess: () => { queryClient.invalidateQueries(['documents', launchId]); toast.success('Document deleted') }
  })

  const handleFile = (file) => {
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', selectedCategory)
    uploadMutation.mutate(formData)
  }

  const filteredDocs = documents?.filter(doc => {
    const matchesSearch = search === '' || doc.fileName.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === 'All' || doc.fileType?.includes(
      filterCategory === 'PDF' ? 'pdf' : filterCategory === 'Word' ? 'word' : filterCategory === 'Excel' ? 'excel' : filterCategory === 'Image' ? 'image' : ''
    )
    return matchesSearch && matchesCategory
  }) || []

  const groupedByName = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.fileName]) acc[doc.fileName] = []
    acc[doc.fileName].push(doc)
    return acc
  }, {})

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="section-title" style={{ fontSize: '14px' }}>Document management</div>
        <select className="form-input" style={{ width: 'auto' }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option>General</option><option>Regulatory</option><option>Manufacturing</option><option>Quality</option><option>Commercial</option>
        </select>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={(e) => e.preventDefault()}
        style={{ border: '1.5px dashed rgba(0,0,0,0.12)', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '16px', background: '#F9FAFB' }}
      >
        <Upload size={24} style={{ color: '#9CA3AF', marginBottom: '8px' }} />
        <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>Drag and drop a file here</div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '10px' }}>or</div>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          Browse files
          <input type="file" onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} />
        </label>
        {uploading && <div style={{ fontSize: '12px', color: '#1A6FD4', marginTop: '8px' }}>Uploading...</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <span style={{ fontSize: '14px' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '15px', padding: 0 }}>×</button>}
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option>All</option><option>PDF</option><option>Word</option><option>Excel</option><option>Image</option>
        </select>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '20px' }}>Loading documents...</div>
      ) : Object.keys(groupedByName).length === 0 ? (
        <div className="empty-state">
          <FileText size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
          {search || filterCategory !== 'All' ? (
            <>
              <div style={{ fontSize: '13px' }}>No documents match your search</div>
              <button onClick={() => { setSearch(''); setFilterCategory('All') }} className="btn btn-outline btn-sm" style={{ marginTop: '8px' }}>Clear filters</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '13px' }}>No documents uploaded yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Upload regulatory, manufacturing or quality documents</div>
            </>
          )}
        </div>
      ) : (
        Object.entries(groupedByName).map(([fileName, versions]) => {
          const latest = versions.sort((a, b) => b.version - a.version)[0]
          return (
            <div key={fileName} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ width: '34px', height: '34px', background: '#EBF3FD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <File size={16} color="#1A6FD4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', gap: '8px' }}>
                  <span className="badge badge-gray">{latest.category}</span>
                  {versions.length > 1 && <span>{versions.length} versions</span>}
                  <span>{new Date(latest.uploadedAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a href={`http://localhost:5000${latest.filePath}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px', borderRadius: '6px', background: '#E6F7F2', color: '#0D9E7A', display: 'flex' }}>
                  <Download size={14} />
                </a>
                <button onClick={() => deleteMutation.mutate(latest.id)} style={{ padding: '6px', border: 'none', borderRadius: '6px', background: '#FDECEA', color: '#C8362E', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}