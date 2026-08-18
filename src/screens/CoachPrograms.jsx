import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchCoachRoster } from '../utils/coachStats'
import { fetchProgramLibrary, fetchAssignationsForPrograms, createProgram, deleteProgram, assignProgram, unassignProgram } from '../utils/programs'
import '../styles/CoachPrograms-redesign.css'

const EMPTY_ROW = { name: '', sets: 4, reps: '8-10', kg: '', rest: 90 }

// Veille produit 2026-08-11, proposition n°4 : bibliothèque de programmes
// réutilisables. Accessible depuis un bouton sur CoachDashboard plutôt
// qu'un 5ᵉ onglet de nav — la nav coach est volontairement restée à 4
// onglets fixes (Board/Clients/Messages/Réglages), un ajout de plus les
// aurait tous rétrécis pour une fonctionnalité secondaire, pas quotidienne.
//
// Restyle coach (handoff "Redesign interface VOLTA (8)") — écran 5/6, pas
// de nav sur cet écran (README : "Programmes ... n'en ont pas, ce sont des
// écrans secondaires"), cohérent avec MemberDetail déjà migré.
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

  // Même raison que les autres écrans coach restylés : évite que le
  // rubber-band iOS au-delà des limites du wrapper ne retombe sur le
  // dégradé corail partagé de <body>.
  useEffect(() => {
    document.body.classList.add('coachprograms-body-bg')
    return () => document.body.classList.remove('coachprograms-body-bg')
  }, [])

  async function load() {
    setLoading(true)
    const [lib, mem] = await Promise.all([
      fetchProgramLibrary(),
      // Roster d'identité : un programme est un contenu que le coach assigne,
      // il ne dépend pas du consentement au partage des données de suivi.
      fetchCoachRoster(),
    ])
    setLibrary(lib)
    setMembers(mem)
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
    <div className="app-wrapper coachprograms-redesign">
      <div className="coachprograms-screen">
        <div className="cp-topbar">
          <button className="cp-back" onClick={() => navigate('/coach')} aria-label="Retour">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="cp-title">Programmes</h1>
        </div>

        {!creating && (
          <button className="cp-add-btn" onClick={() => setCreating(true)}>
            + Nouveau programme
          </button>
        )}

        {creating && (
          <div className="cp-form-card">
            <label className="cp-field">
              <span className="cp-field-label">Nom du programme</span>
              <input type="text" value={newTitre} onChange={e => setNewTitre(e.target.value)} placeholder="Ex: PUSH DAY débutant" />
            </label>

            {newExercises.map((row, i) => (
              <div key={i} className="cp-exercise-row">
                <label className="cp-field" style={{ marginBottom: 0 }}>
                  {i === 0 && <span className="cp-field-label">Exercice</span>}
                  <input type="text" value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="Développé couché" />
                </label>
                <label className="cp-field" style={{ marginBottom: 0 }}>
                  {i === 0 && <span className="cp-field-label">Séries</span>}
                  <input type="number" value={row.sets} onChange={e => updateRow(i, 'sets', e.target.value)} />
                </label>
                <label className="cp-field" style={{ marginBottom: 0 }}>
                  {i === 0 && <span className="cp-field-label">Reps</span>}
                  <input type="text" value={row.reps} onChange={e => updateRow(i, 'reps', e.target.value)} placeholder="8-10" />
                </label>
                <label className="cp-field" style={{ marginBottom: 0 }}>
                  {i === 0 && <span className="cp-field-label">Kg</span>}
                  <input type="number" value={row.kg} onChange={e => updateRow(i, 'kg', e.target.value)} />
                </label>
                <button className="cp-exercise-remove" onClick={() => removeRow(i)} disabled={newExercises.length === 1} aria-label="Retirer cet exercice">
                  ✕
                </button>
              </div>
            ))}
            <button className="cp-add-row-btn" onClick={addRow}>+ Ajouter un exercice</button>

            <div className="cp-form-actions">
              <button className="cp-add-btn" onClick={handleCreate} disabled={creatingSaving || !newTitre.trim()} style={{ marginBottom: 0 }}>
                {creatingSaving ? '...' : 'Enregistrer'}
              </button>
              <button className="cp-cancel-btn" onClick={() => { setCreating(false); setNewTitre(''); setNewExercises([{ ...EMPTY_ROW }]) }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="cp-loading">Chargement...</p>
        ) : library.length === 0 && !creating ? (
          <p className="cp-empty">Aucun programme dans la bibliothèque. Crée le premier avec le bouton ci-dessus.</p>
        ) : (
          <div className="cp-list">
            {library.map(p => {
              const assignedIds = assignations[p.id] || new Set()
              const assignedMembers = members.filter(m => assignedIds.has(m.user_id))
              return (
                <div key={p.id} className="cp-card">
                  <div className="cp-card-head">
                    <span className="cp-card-name">{p.titre}</span>
                    <button className={`cp-delete-link${confirmDeleteId === p.id ? ' confirm' : ''}`} onClick={() => handleDelete(p.id)}>
                      {confirmDeleteId === p.id ? 'Confirmer ?' : 'Supprimer'}
                    </button>
                  </div>
                  <p className="cp-card-summary">
                    {p.exercices.length} exercice{p.exercices.length > 1 ? 's' : ''} · {p.exercices.map(e => e.name).join(', ')}
                  </p>
                  {assignedMembers.length > 0 && (
                    /* Vrai <button> plutôt qu'un <span> cliquable : une action
                       destructive (retirer le programme d'un membre) doit être
                       atteignable au clavier et annoncée comme un contrôle. */
                    <div className="cp-assigned">
                      {assignedMembers.map(m => (
                        <button key={m.user_id} type="button" className="cp-assigned-chip" onClick={() => handleUnassign(p.id, m.user_id)} aria-label={`Retirer ce programme à ${m.prenom}`}>
                          {m.prenom} ✕
                        </button>
                      ))}
                    </div>
                  )}
                  <button className="cp-assign-btn" onClick={() => openAssign(p.id)}>
                    + Assigner à des membres
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {assigningId && (
        <>
          <div className="cp-sheet-overlay" onClick={() => setAssigningId(null)} />
          <div className="cp-sheet">
            <h2 className="cp-sheet-title">{assigningProgram?.titre}</h2>
            <p className="cp-sheet-sub">Sélectionne les membres à qui assigner ce programme</p>
            <div className="cp-sheet-list">
              {members.length === 0 && <p className="cp-empty">Aucun membre dans ta salle.</p>}
              {members.map(m => {
                const already = (assignations[assigningId] || new Set()).has(m.user_id)
                const checked = selectedMemberIds.has(m.user_id)
                return (
                  <label key={m.user_id} className={`cp-sheet-row${already ? ' already' : ''}`}>
                    <span className={`cp-sheet-checkbox${checked || already ? ' checked' : ''}`}>
                      {(checked || already) && '✓'}
                    </span>
                    <input type="checkbox" checked={checked || already} disabled={already} onChange={() => toggleMember(m.user_id)} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
                    <span className="cp-sheet-name">{m.prenom}{already ? ' (déjà assigné)' : ''}</span>
                  </label>
                )
              })}
            </div>
            <button className="cp-sheet-assign-btn" onClick={handleAssign} disabled={assignSaving || selectedMemberIds.size === 0}>
              {assignSaving ? '...' : `Assigner (${selectedMemberIds.size})`}
            </button>
            <button className="cp-sheet-close-btn" onClick={() => setAssigningId(null)}>Fermer</button>
          </div>
        </>
      )}
    </div>
  )
}
