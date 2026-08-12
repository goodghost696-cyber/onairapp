import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchProgramLibrary, fetchAssignationsForPrograms, createProgram, deleteProgram, assignProgram, unassignProgram } from '../utils/programs'
import CoachNav from '../components/CoachNav'

const EMPTY_ROW = { name: '', sets: 4, reps: '8-10', kg: '', rest: 90 }

// Veille produit 2026-08-11, proposition n°4 : bibliothèque de programmes
// réutilisables. Accessible depuis un bouton sur CoachDashboard plutôt
// qu'un 5ᵉ onglet de nav — CoachNav.jsx est volontairement resté à 4
// onglets fixes (Board/Clients/Messages/Réglages), un ajout de plus les
// aurait tous rétrécis pour une fonctionnalité secondaire, pas quotidienne.
export default function CoachPrograms() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [library, setLibrary] = useState([])
  const [assignations, setAssignations] = useState({})
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const [creating, setCreating] = useState(false)
  const [newTitre, setNewTitre] = useState('')
  const [newExercises, setNewExercises] = useState([{ ...EMPTY_ROW }])
  const [creatingSaving, setCreatingSaving] = useState(false)

  const [assigningId, setAssigningId] = useState(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set())
  const [assignSaving, setAssignSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function load() {
    setLoading(true)
    const [lib, mem] = await Promise.all([
      fetchProgramLibrary(),
      supabase.from('profiles').select('user_id, prenom').eq('role', 'member'),
    ])
    setLibrary(lib)
    setMembers(mem.data || [])
    setAssignations(await fetchAssignationsForPrograms(lib.map(p => p.id)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function updateRow(i, field, value) {
    setNewExercises(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  function addRow() {
    setNewExercises(prev => [...prev, { ...EMPTY_ROW }])
  }
  function removeRow(i) {
    setNewExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleCreate() {
    if (!user?.id || !newTitre.trim()) return
    const clean = newExercises
      .filter(r => r.name.trim())
      .map(r => ({ name: r.name.trim(), sets: Number(r.sets) || 1, reps: r.reps || '', kg: r.kg === '' ? null : Number(r.kg), rest: Number(r.rest) || 60 }))
    if (clean.length === 0) return
    setCreatingSaving(true)
    const result = await createProgram(user.id, newTitre, clean)
    setCreatingSaving(false)
    if (result.success) {
      setNewTitre('')
      setNewExercises([{ ...EMPTY_ROW }])
      setCreating(false)
      load()
    }
  }

  function handleDelete(programmeId) {
    if (confirmDeleteId !== programmeId) {
      setConfirmDeleteId(programmeId)
      setTimeout(() => setConfirmDeleteId(prev => prev === programmeId ? null : prev), 3000)
      return
    }
    setConfirmDeleteId(null)
    deleteProgram(programmeId).then(r => { if (r.success) load() })
  }

  function openAssign(programmeId) {
    setAssigningId(programmeId)
    setSelectedMemberIds(new Set())
  }

  function toggleMember(userId) {
    setSelectedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleAssign() {
    if (!user?.id || !assigningId || selectedMemberIds.size === 0) return
    setAssignSaving(true)
    await assignProgram(user.id, assigningId, [...selectedMemberIds])
    setAssignSaving(false)
    setAssigningId(null)
    load()
  }

  async function handleUnassign(programmeId, memberUserId) {
    const result = await unassignProgram(programmeId, memberUserId)
    if (result.success) load()
  }

  const assigningProgram = library.find(p => p.id === assigningId)

  return (
    <div className="app-wrapper">
      <div className="screen coach-narrow">
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button className="icon-btn" onClick={() => navigate('/coach')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="text-xl bold" style={{ flex: 1 }}>Programmes</h1>
        </div>

        {!creating && (
          <button className="btn-accent" onClick={() => setCreating(true)} style={{ marginBottom: 16 }}>
            + NOUVEAU PROGRAMME
          </button>
        )}

        {creating && (
          <div className="card card-animated" style={{ marginBottom: 16, '--delay': '0ms' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <span className="text-xs text-muted">Nom du programme</span>
              <input type="text" value={newTitre} onChange={e => setNewTitre(e.target.value)} placeholder="Ex: PUSH DAY débutant" style={{ padding: '10px 12px', fontSize: 14 }} />
            </label>

            {newExercises.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 8, alignItems: 'end' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {i === 0 && <span className="text-xs text-muted">Exercice</span>}
                  <input type="text" value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="Développé couché" style={{ padding: '8px 10px', fontSize: 13 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {i === 0 && <span className="text-xs text-muted">Séries</span>}
                  <input type="number" value={row.sets} onChange={e => updateRow(i, 'sets', e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {i === 0 && <span className="text-xs text-muted">Reps</span>}
                  <input type="text" value={row.reps} onChange={e => updateRow(i, 'reps', e.target.value)} placeholder="8-10" style={{ padding: '8px 10px', fontSize: 13 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {i === 0 && <span className="text-xs text-muted">Kg</span>}
                  <input type="number" value={row.kg} onChange={e => updateRow(i, 'kg', e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }} />
                </label>
                <button onClick={() => removeRow(i)} disabled={newExercises.length === 1} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: newExercises.length === 1 ? 'default' : 'pointer', opacity: newExercises.length === 1 ? 0.3 : 1, padding: '8px 4px' }}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn-ghost" onClick={addRow} style={{ marginBottom: 14, fontSize: 12 }}>+ AJOUTER UN EXERCICE</button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-accent" onClick={handleCreate} disabled={creatingSaving || !newTitre.trim()} style={{ flex: 1, opacity: creatingSaving ? 0.7 : 1 }}>
                {creatingSaving ? '...' : 'ENREGISTRER'}
              </button>
              <button className="btn-ghost" onClick={() => { setCreating(false); setNewTitre(''); setNewExercises([{ ...EMPTY_ROW }]) }} style={{ flex: 1 }}>
                ANNULER
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted">Chargement...</p>
        ) : library.length === 0 && !creating ? (
          <p className="text-sm text-muted">Aucun programme dans la bibliothèque. Crée le premier avec le bouton ci-dessus.</p>
        ) : (
          library.map((p, i) => {
            const assignedIds = assignations[p.id] || new Set()
            const assignedMembers = members.filter(m => assignedIds.has(m.user_id))
            return (
              <div key={p.id} className="card card-animated" style={{ marginBottom: 8, '--delay': `${60 + i * 40}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="text-sm bold">{p.titre}</span>
                  <button className="text-action-btn" onClick={() => handleDelete(p.id)} style={{ color: confirmDeleteId === p.id ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {confirmDeleteId === p.id ? 'Confirmer ?' : 'Supprimer'}
                  </button>
                </div>
                <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
                  {p.exercices.length} exercice{p.exercices.length > 1 ? 's' : ''} · {p.exercices.map(e => e.name).join(', ')}
                </p>
                {assignedMembers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {assignedMembers.map(m => (
                      <span key={m.user_id} onClick={() => handleUnassign(p.id, m.user_id)} style={{ cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 100, background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                        {m.prenom} ✕
                      </span>
                    ))}
                  </div>
                )}
                <button className="btn-ghost" onClick={() => openAssign(p.id)} style={{ fontSize: 12 }}>
                  + ASSIGNER À DES MEMBRES
                </button>
              </div>
            )
          })
        )}
      </div>

      {assigningId && (
        <>
          <div className="modal-overlay" onClick={() => setAssigningId(null)} />
          <div className="exercise-modal">
            <div className="modal-content">
              <h2 className="modal-title">{assigningProgram?.titre}</h2>
              <p className="text-xs text-muted" style={{ marginBottom: 14 }}>Sélectionne les membres à qui assigner ce programme</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
                {members.length === 0 && <p className="text-sm text-muted">Aucun membre dans ta salle.</p>}
                {members.map(m => {
                  const already = (assignations[assigningId] || new Set()).has(m.user_id)
                  const checked = selectedMemberIds.has(m.user_id)
                  return (
                    <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '2px solid var(--border)', opacity: already ? 0.4 : 1, cursor: already ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={checked || already} disabled={already} onChange={() => toggleMember(m.user_id)} style={{ width: 18, height: 18 }} />
                      <span className="text-sm">{m.prenom}{already ? ' (déjà assigné)' : ''}</span>
                    </label>
                  )
                })}
              </div>
              <button className="modal-add-btn" onClick={handleAssign} disabled={assignSaving || selectedMemberIds.size === 0}>
                {assignSaving ? '...' : `ASSIGNER (${selectedMemberIds.size})`}
              </button>
              <button className="btn-ghost" onClick={() => setAssigningId(null)} style={{ marginTop: 8, width: '100%' }}>Fermer</button>
            </div>
          </div>
        </>
      )}
      <CoachNav />
    </div>
  )
}
