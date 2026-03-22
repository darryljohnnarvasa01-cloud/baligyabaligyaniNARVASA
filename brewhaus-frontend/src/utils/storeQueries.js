export function resetStoreCatalogQueries(queryClient) {
  queryClient.removeQueries({ queryKey: ['store-products'] })
  queryClient.removeQueries({ queryKey: ['store-product'] })
  queryClient.removeQueries({ queryKey: ['store-categories'] })
}
