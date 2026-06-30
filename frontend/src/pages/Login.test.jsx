import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { authService } from '../services/auth'

vi.mock('../services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn()
  }
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits login credentials and returns the user', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    authService.login.mockResolvedValue({
      success: true,
      user: { id: 1, username: 'admin' }
    })

    render(<Login onLogin={onLogin} />)

    await user.type(screen.getByPlaceholderText(/用户名|璇疯緭鍏ョ敤鎴峰悕/i), 'admin')
    await user.type(screen.getByPlaceholderText(/密码|璇疯緭鍏ュ瘑鐮/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /登录|鐧诲綍/i }))

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('admin', 'admin123')
      expect(onLogin).toHaveBeenCalledWith({ id: 1, username: 'admin' })
    })
  })
})
