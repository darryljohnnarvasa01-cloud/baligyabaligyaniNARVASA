import { useMemo, useState } from 'react'
import { PencilLine, Plus, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AddressForm from '../../components/checkout/AddressForm'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { useAddresses } from '../../hooks/checkout/useAddresses'
import useAuth from '../../hooks/useAuth'

function createAddressForm(user = null) {
  return {
    label: 'Home',
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    is_default: false,
  }
}

function cloneAddress(address) {
  return {
    label: address?.label || 'Home',
    recipient_name: address?.recipient_name || '',
    phone: address?.phone || '',
    street: address?.street || '',
    barangay: address?.barangay || '',
    city: address?.city || '',
    province: address?.province || '',
    zip_code: address?.zip_code || '',
    is_default: Boolean(address?.is_default),
  }
}

/**
 * // [CODEX] React e-commerce component: AddressBookPage
 * // Uses: useAddresses, AddressForm, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: manages the customer's saved addresses, including create, edit, delete, and default selection.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function AddressBookPage() {
  const { user } = useAuth()
  const {
    addresses,
    createAddress,
    deleteAddress,
    isError,
    isLoading,
    isPending,
    refetch,
    setDefaultAddress,
    updateAddress,
  } = useAddresses()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(() => createAddressForm(user))
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [editingForm, setEditingForm] = useState(() => createAddressForm(user))

  const sortedAddresses = useMemo(
    () => [...addresses].sort((left, right) => Number(right.is_default) - Number(left.is_default) || Number(right.id) - Number(left.id)),
    [addresses],
  )

  const handleCreateChange = (key, value) => {
    setCreateForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleEditChange = (key, value) => {
    setEditingForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const beginEdit = (address) => {
    setEditingAddressId(address.id)
    setEditingForm(cloneAddress(address))
    setShowCreateForm(false)
  }

  const resetCreateForm = () => {
    setCreateForm(createAddressForm(user))
    setShowCreateForm(false)
  }

  const handleCreate = async () => {
    try {
      await createAddress(createForm)
      toast.success('Address saved.')
      resetCreateForm()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleUpdate = async (address) => {
    try {
      await updateAddress(address.id, {
        ...editingForm,
        is_default: address.is_default ? true : editingForm.is_default,
      })
      toast.success('Address updated.')
      setEditingAddressId(null)
      setEditingForm(createAddressForm(user))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (addressId) => {
    if (!window.confirm('Delete this saved address?')) {
      return
    }

    try {
      await deleteAddress(addressId)
      toast.success('Address deleted.')
      if (editingAddressId === addressId) {
        setEditingAddressId(null)
        setEditingForm(createAddressForm(user))
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleSetDefault = async (addressId) => {
    try {
      await setDefaultAddress(addressId)
      toast.success('Default address updated.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-border bg-surface px-6 py-7 shadow-sm sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-3">Address Book</div>
            <h1 className="mt-4 font-display text-5xl font-bold italic text-ink">Delivery locations ready for checkout.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-3">
              Save home, office, or gifting destinations so you can move through checkout without re-entering the same details.
            </p>
          </div>

          <button
            className="midnight-ember-button px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
            onClick={() => {
              setShowCreateForm((current) => !current)
              setEditingAddressId(null)
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? 'Close Form' : 'Add New Address'}
          </button>
        </div>
      </div>

      {showCreateForm ? (
        <AddressForm
          isSubmitting={isPending}
          onCancel={resetCreateForm}
          onChange={handleCreateChange}
          onSubmit={handleCreate}
          submitLabel="Save Address"
          value={createForm}
        />
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : isError ? (
        <ErrorState
          description="We could not load the saved address book. Retry once the request settles."
          onAction={refetch}
          title="Unable to load addresses."
        />
      ) : sortedAddresses.length ? (
        <div className="space-y-4">
          {sortedAddresses.map((address) => (
            <div className="rounded-[28px] border border-border bg-surface px-6 py-6 shadow-sm" key={address.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-display text-3xl italic text-ink">{address.label}</div>
                    {address.is_default ? (
                      <span className="rounded-[5px] border border-ember/45 bg-ember-l px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ember">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 text-sm text-ink-2">{address.recipient_name}</div>
                  <div className="mt-1 text-sm text-ink-3">{address.phone}</div>
                  <div className="mt-3 max-w-2xl text-sm leading-7 text-ink-3">{address.full_address}</div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!address.is_default ? (
                    <button
                      className="midnight-ghost-button px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
                      onClick={() => handleSetDefault(address.id)}
                      type="button"
                    >
                      <Star className="h-4 w-4" />
                      Make Default
                    </button>
                  ) : null}
                  <button
                    className="midnight-ghost-button px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
                    onClick={() => beginEdit(address)}
                    type="button"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="rounded-[8px] border border-flame/45 bg-flame-l px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-flame transition hover:bg-flame/14"
                    onClick={() => handleDelete(address.id)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              {editingAddressId === address.id ? (
                <div className="mt-6">
                  <AddressForm
                    isSubmitting={isPending}
                    onCancel={() => {
                      setEditingAddressId(null)
                      setEditingForm(createAddressForm(user))
                    }}
                    onChange={handleEditChange}
                    onSubmit={() => handleUpdate(address)}
                    submitLabel="Update Address"
                    value={editingForm}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel="Add First Address"
          description="Save a delivery address now so checkout is ready the next time you place an order."
          onAction={() => setShowCreateForm(true)}
          title="No saved addresses yet."
          titleClassName="font-display text-3xl italic text-ink"
        />
      )}
    </section>
  )
}
