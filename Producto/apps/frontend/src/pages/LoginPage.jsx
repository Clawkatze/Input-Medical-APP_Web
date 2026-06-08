import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email,    setEmail]    = useState('admin@inputmedical.cl')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      sessionStorage.removeItem('alertas_modal_visto')
      console.log('sessionStorage después de remove:', sessionStorage.getItem('alertas_modal_visto'))
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Contraseña o email incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative w-full max-w-[400px] z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 w-16 h-16 bg-gradient-to-br from-primary to-primary-container rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-4xl">medical_services</span>
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight text-center">Input Medical</h1>
        </div>

        <section className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 p-8">
          <h2 className="font-bold text-xl mb-2">Acceso Administrador</h2>
          <p className="text-on-surface-variant text-sm mb-8">Inicie sesión para gestionar el inventario.</p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface-variant ml-1">Email</label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="block w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="nombre@inputmedical.cl"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface-variant ml-1">Contraseña</label>
              <input
                type="password" required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full h-14 bg-primary text-on-primary font-bold rounded-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              {!loading && <span className="material-symbols-outlined">login</span>}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}