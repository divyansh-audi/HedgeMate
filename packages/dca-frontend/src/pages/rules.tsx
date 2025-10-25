import React, { useState } from 'react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreateDCA } from '@/components/create-dca';
import { ActiveDcas } from '@/components/active-dcas';
import { Info } from '@/components/info';
import { Wallet } from '@/components/wallet';
import { Navbar } from '@/components/navbar';

enum Tab {
  CreateDCA = 'create-dca',
  ActiveDCAs = 'active-dcas',
  Wallet = 'wallet',
}

export const Rules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CreateDCA);

  return (
    <>
      <Navbar />
      <div
        className={
          'flex flex-col items-center justify-center min-h-screen min-w-screen bg-gray-100'
        }
      >
        <Tabs
          data-testid="dca-tabs"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as Tab)}
          className="bg-white p-6 shadow-sm w-full xl:max-w-4xl h-full"
        >
          <TabsList className="mb-4 flex space-x-2 rounded-md bg-gray-200 p-2 w-full">
            <TabsTrigger value={Tab.CreateDCA}>Create Rule</TabsTrigger>
            <TabsTrigger value={Tab.ActiveDCAs}>Active Rules</TabsTrigger>
            <TabsTrigger value={Tab.Wallet}>Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value={Tab.CreateDCA}>
            <CreateDCA onCreate={() => setActiveTab(Tab.ActiveDCAs)} />
          </TabsContent>
          <TabsContent value={Tab.ActiveDCAs}>
            <ActiveDcas />
          </TabsContent>
          <TabsContent value={Tab.Wallet}>
            <Wallet />
          </TabsContent>
        </Tabs>

        <Info />
      </div>
    </>
  );
};
