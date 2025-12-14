/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import React from 'react'

import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunctions = handleServerFunctions({
  config,
  importMap: {},
})

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={{}} serverFunctions={serverFunctions}>
    {children}
  </RootLayout>
)

export default Layout
