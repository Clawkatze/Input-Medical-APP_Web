import { useEffect, useState } from 'react'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ROLES = ['superadmin', 'admin', 'bodeguero', 'visualizador']
const ROL_COLOR = {
  superadmin:   'bg-primary/10 text-primary',
  admin:        'bg-secondary/10 text-secondary',
  bodeguero:    'bg-tertiary-fixed text-on-tertiary-fixed',
  visualizador: 'bg-zinc-100 text-zinc-600',
}
const ROL_LABEL = {
  superadmin:   'Super Admin',
  admin:        'Admin',
  bodeguero:    'Bodeguero',
  visualizador: 'Visualizador',
}

const FORM_INIT = { nombre: '', email: '', password: '', rol: 'admin' }

export default function UsuariosPage() {
  const [usuarios,   setUsuarios]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)  // null | 'crear' | 'editar' | 'password'
  const [selected,   setSelected]   = useState(null)
  const [form,       setForm]       = useState(FORM_INIT)
  const [submitting, setSubmitting] = useState(false)
  const { user: me } = useAuth()

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    try {
      const { data } = await api.get('/api/usuarios')
      setUsuarios(data)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  function abrirCrear() {
    setForm(FORM_INIT)
    setSelected(null)
    setModal('crear')
  }

  function abrirEditar(u) {
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol })
    setSelected(u)
    setModal('editar')
  }

  function abrirPassword(u) {
    setForm({ ...FORM_INIT, password: '' })
    setSelected(u)
    setModal('password')
  }

  async function handleCrear(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/usuarios', form)
      toast.success(`Usuario ${form.email} creado correctamente`)
      setModal(null)
      fetchUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear usuario')
    } finally { setSubmitting(false) }
  }

  async function handleEditar(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.put(`/api/usuarios/${selected.id}`, {
        nombre: form.nombre,
        email:  form.email,
        rol:    form.rol,
      })
      toast.success('Usuario actualizado')
      setModal(null)
      fetchUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar')
    } finally { setSubmitting(false) }
  }

  async function handlePassword(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.put(`/api/usuarios/${selected.id}/password`, { password: form.password })
      toast.success('Contraseña actualizada correctamente')
      setModal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña')
    } finally { setSubmitting(false) }
  }

  async function handleToggleActivo(u) {
    if (u.id === me.id) { toast.error('No puedes desactivar tu propia cuenta'); return }
    try {
      await api.put(`/api/usuarios/${u.id}`, { activo: !u.activo })
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
      fetchUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  return (
    <PageLayout title="Gestión de Usuarios">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Usuarios del Sistema</h2>
            <p className="text-on-surface-variant text-sm mt-1">Solo el Super Admin puede gestionar usuarios</p>
          </div>
          <button onClick={abrirCrear}
            className="h-14 px-8 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-3 shadow-lg hover:opacity-90">
            <span className="material-symbols-outlined">person_add</span>
            Nuevo Usuario
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b text-xs uppercase font-bold text-zinc-500">
                <th className="px-6 py-5">Usuario</th>
                <th className="px-6 py-5">Rol</th>
                <th className="px-6 py-5">Último Acceso</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : usuarios.map(u => (
                <tr key={u.id} className={`hover:bg-zinc-50 transition-colors ${!u.activo ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-5">
                    <p className="font-bold">{u.nombre}</p>
                    <p className="text-xs text-on-surface-variant">{u.email}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${ROL_COLOR[u.rol]}`}>
                      {ROL_LABEL[u.rol]}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant">
                    {u.ultimo_acceso
                      ? format(new Date(u.ultimo_acceso), 'dd MMM yyyy HH:mm', { locale: es })
                      : '—'}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-xs font-bold ${u.activo ? 'text-secondary' : 'text-error'}`}>
                      {u.activo ? '● Activo' : '● Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right space-x-1">
                    <button onClick={() => abrirEditar(u)} title="Editar"
                      className="p-2 hover:bg-zinc-100 rounded-lg">
                      <span className="material-symbols-outlined text-zinc-500 text-[20px]">edit</span>
                    </button>
                    <button onClick={() => abrirPassword(u)} title="Cambiar contraseña"
                      className="p-2 hover:bg-zinc-100 rounded-lg">
                      <span className="material-symbols-outlined text-zinc-500 text-[20px]">lock_reset</span>
                    </button>
                    {u.id !== me.id && (
                      <button onClick={() => handleToggleActivo(u)}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                        className="p-2 hover:bg-zinc-100 rounded-lg">
                        <span className={`material-symbols-outlined text-[20px] ${u.activo ? 'text-error' : 'text-secondary'}`}>
                          {u.activo ? 'person_off' : 'person'}
                        </span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

            {/* Crear usuario */}
            {modal === 'crear' && (
              <>
                <h3 className="text-xl font-black mb-6">Nuevo Usuario</h3>
                <form onSubmit={handleCrear} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Nombre *</label>
                    <input required value={form.nombre} onChange={e => set('nombre', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Email *</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="usuario@inputmedical.cl" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Contraseña *</label>
                    <input required type="password" value={form.password} onChange={e => set('password', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Mínimo 6 caracteres" minLength={6} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Rol *</label>
                    <select required value={form.rol} onChange={e => set('rol', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary">
                      {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 font-bold text-on-surface-variant hover:bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-60">
                      {submitting ? 'Creando...' : 'Crear Usuario'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Editar usuario */}
            {modal === 'editar' && (
              <>
                <h3 className="text-xl font-black mb-6">Editar Usuario</h3>
                <form onSubmit={handleEditar} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Nombre</label>
                    <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Email</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Rol</label>
                    <select value={form.rol} onChange={e => set('rol', e.target.value)}
                      disabled={selected?.id === me.id}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
                      {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                    {selected?.id === me.id && (
                      <p className="text-xs text-on-surface-variant mt-1">No puedes cambiar tu propio rol</p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 font-bold text-on-surface-variant hover:bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-60">
                      {submitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Cambiar contraseña */}
            {modal === 'password' && (
              <>
                <h3 className="text-xl font-black mb-2">Cambiar Contraseña</h3>
                <p className="text-on-surface-variant text-sm mb-6">Usuario: <span className="font-bold">{selected?.email}</span></p>
                <form onSubmit={handlePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Nueva Contraseña *</label>
                    <input required type="password" value={form.password} onChange={e => set('password', e.target.value)}
                      className="w-full h-12 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Mínimo 6 caracteres" minLength={6} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 font-bold text-on-surface-variant hover:bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-60">
                      {submitting ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
