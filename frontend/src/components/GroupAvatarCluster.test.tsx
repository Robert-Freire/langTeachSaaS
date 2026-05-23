import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupAvatarCluster, type GroupAvatarMember } from './GroupAvatarCluster'
import { getAvatarColor } from '@/lib/avatarColor'

function makeMembers(n: number): GroupAvatarMember[] {
  return Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, name: `Person ${i}` }))
}

describe('GroupAvatarCluster', () => {
  it('renders up to 3 tiles for size=sm and no overflow when count <= 3', () => {
    render(<GroupAvatarCluster size="sm" members={makeMembers(3)} totalCount={3} />)
    expect(screen.getAllByTestId('group-avatar-tile')).toHaveLength(3)
    expect(screen.queryByTestId('group-avatar-overflow')).toBeNull()
  })

  it('shows +N overflow chip when totalCount exceeds 3 for size=sm', () => {
    render(<GroupAvatarCluster size="sm" members={makeMembers(4)} totalCount={7} />)
    expect(screen.getAllByTestId('group-avatar-tile')).toHaveLength(3)
    expect(screen.getByTestId('group-avatar-overflow')).toHaveTextContent('+4')
  })

  it('renders 2x2 grid for size=lg with overflow on the 4th slot when count > 4', () => {
    render(<GroupAvatarCluster size="lg" members={makeMembers(5)} totalCount={10} />)
    expect(screen.getAllByTestId('group-avatar-tile')).toHaveLength(3)
    expect(screen.getByTestId('group-avatar-overflow')).toHaveTextContent('+6')
  })

  it('renders 4 tiles and no overflow for size=lg when count = 4', () => {
    render(<GroupAvatarCluster size="lg" members={makeMembers(4)} totalCount={4} />)
    expect(screen.getAllByTestId('group-avatar-tile')).toHaveLength(4)
    expect(screen.queryByTestId('group-avatar-overflow')).toBeNull()
  })

  it('applies stable color per member id (matches getAvatarColor)', () => {
    const member: GroupAvatarMember = { id: 'yasmine-uuid-stable', name: 'Yasmine A' }
    render(<GroupAvatarCluster size="sm" members={[member]} totalCount={1} />)
    const tile = screen.getByTestId('group-avatar-tile')
    const palette = getAvatarColor(member.id)
    for (const cls of palette.split(' ')) expect(tile.className).toContain(cls)
  })

  it('exposes an accessible name listing visible members and total count', () => {
    render(<GroupAvatarCluster size="sm" members={makeMembers(2)} totalCount={2} />)
    expect(screen.getByRole('img', { name: /2 members: Person 0, Person 1/i })).toBeInTheDocument()
  })

  it('uses singular member in aria-label when totalCount = 1', () => {
    render(<GroupAvatarCluster size="sm" members={makeMembers(1)} totalCount={1} />)
    expect(screen.getByRole('img', { name: /^1 member: Person 0$/i })).toBeInTheDocument()
  })
})
