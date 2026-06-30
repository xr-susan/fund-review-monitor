import { render, screen } from '@testing-library/react'
import { Wallet } from 'lucide-react'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('renders the title, value, change and subtitle', () => {
    render(
      <StatCard
        title="Total assets"
        value="¥12,345"
        change={2.34}
        subtitle="Updated today"
        icon={Wallet}
      />
    )

    expect(screen.getByText('Total assets')).toBeInTheDocument()
    expect(screen.getByText('¥12,345')).toBeInTheDocument()
    expect(screen.getByText('2.34%')).toBeInTheDocument()
    expect(screen.getByText('Updated today')).toBeInTheDocument()
  })

  it('shows a loading skeleton instead of the value', () => {
    const { container } = render(<StatCard title="Loading" value="hidden" loading />)

    expect(screen.getByText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument()
  })
})
