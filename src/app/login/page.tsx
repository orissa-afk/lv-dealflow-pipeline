import LoginForm from './LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FFF1E5' }}
    >
      {/* FT-style top rule */}
      <div style={{ height: '4px', backgroundColor: '#7B1D3C' }} />

      {/* Masthead */}
      <div style={{ backgroundColor: '#7B1D3C' }} className="text-white py-3">
        <div className="text-center">
          <span
            className="text-lg font-bold tracking-widest uppercase"
            style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.15em' }}
          >
            Love Ventures
          </span>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#E9E1D9' }} />

      {/* Main content — centred card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div
            className="bg-white rounded-sm shadow-sm border"
            style={{ borderColor: '#E9E1D9' }}
          >
            {/* Card header */}
            <div
              className="px-8 pt-8 pb-5 border-b"
              style={{ borderColor: '#E9E1D9' }}
            >
              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Georgia, serif', color: '#33302E' }}
              >
                Sign in
              </h1>
              <p
                className="text-sm"
                style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: '#66605C' }}
              >
                Deal Intelligence Platform
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              <LoginForm />
            </div>
          </div>

          {/* Footer */}
          <p
            className="text-center text-xs mt-6"
            style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: '#66605C' }}
          >
            © {new Date().getFullYear()} Love Ventures · Internal use only
          </p>
        </div>
      </div>
    </div>
  )
}
