"use client";

import QueueModal from "@/app/shared/QueueModal";
import { useLocation } from "@/ctx/LocationContext";
import { Button, Input, InputNumber, Switch } from "antd";
import axios from "axios";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaClock, FaEdit, FaPlus, FaUsers } from "react-icons/fa";
import Entity from "../page";
import { withRoleProtection } from "@/lib/auth/withRoleProtection";

interface Counter {
  id: number;
  name: string;
}

interface CounterConfig {
  startNumber: number;
  increment: number;
  numberOfCounters: number;
  manualNames: boolean;
  counters: Counter[];
}

interface QueueConfig {
  id?: number;
  name: string;
  maxQueueSize: number;
  isActive: boolean;
  averageServiceTime: number;
  locationId: number;
  counterConfig: CounterConfig;
}

function QueuesPage() {
  const userId = document.cookie
    .split(";")
    .find((cookie) => cookie.includes("userId"))
    ?.split("=")[1];
  const [queueConfigs, setQueueConfigs] = useState<QueueConfig[]>([]);
  const [isAddingQueue, setIsAddingQueue] = useState(false);
  const [isEditingQueue, setIsEditingQueue] = useState<number | null>(null);
  const [newQueue, setNewQueue] = useState<Partial<QueueConfig>>({
    isActive: true,
    counterConfig: {
      startNumber: 1,
      increment: 1,
      numberOfCounters: 1,
      manualNames: false,
      counters: [],
    },
  });
  const { selectedLocation } = useLocation();

  const generateCounterNames = (config: CounterConfig) => {
    const counters: Counter[] = [];
    for (let i = 0; i < config.numberOfCounters; i++) {
      const counterNumber = config.startNumber + i * config.increment;
      counters.push({
        id: i + 1,
        name: `Counter ${counterNumber}`,
      });
    }
    return counters;
  };

  const handleCounterConfigChange = (
    field: keyof CounterConfig,
    value: any
  ) => {
    const updatedConfig = {
      ...newQueue.counterConfig!,
      [field]: value,
    };

    // Initialize or update counters when manual naming is toggled or when counters array is empty
    if (
      (field === "manualNames" && value === true) ||
      (updatedConfig.manualNames &&
        (!updatedConfig.counters || updatedConfig.counters.length === 0))
    ) {
      updatedConfig.counters = generateCounterNames(updatedConfig);
    } else if (!updatedConfig.manualNames) {
      updatedConfig.counters = generateCounterNames(updatedConfig);
    }

    setNewQueue({
      ...newQueue,
      counterConfig: updatedConfig,
    });
  };

  useEffect(() => {
    if (!newQueue.counterConfig?.manualNames) return;

    const currentCounters = newQueue.counterConfig.counters;
    const targetCount = newQueue.counterConfig.numberOfCounters || 0;
    let updatedCounters = [...currentCounters];

    if (currentCounters.length < targetCount) {
      for (let i = currentCounters.length; i < targetCount; i++) {
        updatedCounters.push({
          id: i + 1,
          name: `Counter ${
            newQueue.counterConfig.startNumber +
            i * newQueue.counterConfig.increment
          }`,
        });
      }
    } else if (currentCounters.length > targetCount) {
      updatedCounters = currentCounters.slice(0, targetCount);
    }

    if (updatedCounters.length !== currentCounters.length) {
      setNewQueue((prevQueue) => ({
        ...prevQueue,
        counterConfig: {
          ...prevQueue.counterConfig!,
          counters: updatedCounters,
        },
      }));
    }
  }, [
    newQueue.counterConfig?.numberOfCounters,
    newQueue.counterConfig?.startNumber,
    newQueue.counterConfig?.increment,
    newQueue.counterConfig?.manualNames,
    newQueue.counterConfig?.counters,
  ]);

  const handleCounterNameChange = (counterId: number, name: string) => {
    const updatedCounters = newQueue.counterConfig!.counters.map((counter) =>
      counter.id === counterId ? { ...counter, name } : counter
    );

    setNewQueue({
      ...newQueue,
      counterConfig: {
        ...newQueue.counterConfig!,
        counters: updatedCounters,
      },
    });
  };

  const handleAddQueue = () => {
    if (newQueue.name && newQueue.maxQueueSize) {
      const queueBody = {
        id: userId,
        locationId: selectedLocation?.id || -1,
        name: newQueue.name,
        maxQueueSize: newQueue.maxQueueSize,
        isActive: newQueue.isActive,
        averageServiceTime: newQueue.averageServiceTime,
        counterConfig: newQueue.counterConfig,
      };

      const url = process.env.NEXT_PUBLIC_API_BASE_URL_CREATE_QUEUE || "";

      toast.promise(axios.post(url, queueBody), {
        loading: "Creating queue...",
        success: () => {
          setQueueConfigs([...queueConfigs, queueBody as QueueConfig]);
          setIsAddingQueue(false);
          setNewQueue({
            isActive: true,
            counterConfig: {
              startNumber: 1,
              increment: 1,
              numberOfCounters: 1,
              manualNames: false,
              counters: [],
            },
          });
          return "Queue created successfully!";
        },
        error: "Failed to create queue",
      });
    }
  };

  const handleEditQueue = (queue: QueueConfig) => {
    setIsEditingQueue(queue.id!);
    setNewQueue({
      ...queue,
      counterConfig: {
        ...queue.counterConfig,
        counters: [...queue.counterConfig.counters],
      },
    });
    setIsAddingQueue(true);
  };

  const handleUpdateQueue = () => {
    if (!isEditingQueue) return;

    const url =
      `${process.env.NEXT_PUBLIC_API_BASE_URL_UPDATE_QUEUE}/${isEditingQueue}` ||
      "";

    toast.promise(axios.put(url, newQueue), {
      loading: "Updating queue...",
      success: () => {
        setQueueConfigs(
          queueConfigs.map((q) =>
            q.id === isEditingQueue ? (newQueue as QueueConfig) : q
          )
        );
        setIsAddingQueue(false);
        setIsEditingQueue(null);
        setNewQueue({
          isActive: true,
          counterConfig: {
            startNumber: 1,
            increment: 1,
            numberOfCounters: 1,
            manualNames: false,
            counters: [],
          },
        });
        return "Queue updated successfully!";
      },
      error: "Failed to update queue",
    });
  };

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL_GET_BUSINESS_QUEUES || "";

    toast.promise(axios.get(`${url}?locationId=${selectedLocation?.id}`), {
      loading: "Loading queues...",
      success: (res) => {
        const modifiedData: QueueConfig[] = res.data.queues.map(
          (queue: any) => ({
            id: queue.id,
            name: queue.name,
            maxQueueSize: queue.maxQueueSize,
            isActive: queue.isActive,
            averageServiceTime: queue.averageServiceTime,
            storeId: queue.storeId,
            counterConfig: queue.counterConfig || {
              startNumber: 1,
              increment: 1,
              numberOfCounters: 1,
              manualNames: false,
              counters: [{ id: 1, name: "Counter 1" }],
            },
          })
        );
        setQueueConfigs(modifiedData);
        return "Queues loaded successfully!";
      },
      error: "Failed to load queues",
    });
  }, [userId, selectedLocation]);

  return (
    <Entity>
      <QueueModal title="Queue Management">
        <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-8">
          {/* Queue List */}
          <div className="space-y-3 sm:space-y-4">
            {queueConfigs.map((queue) => (
              <motion.div
                key={queue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-6 bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/20 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Queue Name and Status */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                        queue.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <h3 className="text-base sm:text-lg font-semibold">
                      {queue.name}
                    </h3>
                    <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full bg-ocean-blue/20 text-ocean-blue">
                      {queue.counterConfig.numberOfCounters} Counters
                    </span>
                  </div>

                  {/* Queue Stats and Edit Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 ml-auto">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <FaUsers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Max: {queue.maxQueueSize}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <FaClock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>~{queue.averageServiceTime}min</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleEditQueue(queue)}
                      icon={<FaEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      className="!bg-ocean-blue/20 !text-ocean-blue !border-0 !rounded-lg sm:!rounded-xl !p-2 sm:!p-3"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add/Edit Queue Form */}
          {isAddingQueue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 sm:p-6 bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/20 shadow-lg space-y-4 sm:space-y-6"
            >
              {/* Basic Queue Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Queue Name<span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="Enter queue name"
                    value={newQueue.name}
                    onChange={(e) =>
                      setNewQueue({ ...newQueue, name: e.target.value })
                    }
                    className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Number of Counters<span className="text-red-600">*</span>
                  </label>
                  <InputNumber
                    min={1}
                    value={newQueue.counterConfig?.numberOfCounters}
                    onChange={(value) =>
                      handleCounterConfigChange("numberOfCounters", value)
                    }
                    className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Counter Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Start Number
                  </label>
                  <InputNumber
                    min={1}
                    value={newQueue.counterConfig?.startNumber}
                    onChange={(value) =>
                      handleCounterConfigChange("startNumber", value)
                    }
                    className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Increment By
                  </label>
                  <InputNumber
                    min={1}
                    value={newQueue.counterConfig?.increment}
                    onChange={(value) =>
                      handleCounterConfigChange("increment", value)
                    }
                    className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Queue Capacity and Service Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Max Capacity<span className="text-red-600">*</span>
                  </label>
                  <InputNumber
                    min={1}
                    placeholder="Enter max capacity"
                    value={newQueue.maxQueueSize}
                    onChange={(value) =>
                      setNewQueue({ ...newQueue, maxQueueSize: value! })
                    }
                    className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Average Service Time (min)
                  </label>
                  <InputNumber
                    min={1}
                    placeholder="Enter average time"
                    value={newQueue.averageServiceTime}
                    onChange={(value) =>
                      setNewQueue({ ...newQueue, averageServiceTime: value! })
                    }
                    className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newQueue.isActive}
                    onChange={(checked) =>
                      setNewQueue({ ...newQueue, isActive: checked })
                    }
                    className="!h-5 sm:!h-6 !min-w-[40px] sm:!min-w-[44px] [&>.ant-switch-handle]:!w-4 [&>.ant-switch-handle]:!h-4 
                      sm:[&>.ant-switch-handle]:!w-5 sm:[&>.ant-switch-handle]:!h-5 
                      [&>.ant-switch-handle]:!top-0.5 
                      !bg-gray-300 hover:!bg-gray-400 
                      [&.ant-switch-checked]:!bg-ocean-blue [&.ant-switch-checked]:hover:!bg-ocean-blue/90"
                  />
                  <span className="text-sm">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newQueue.counterConfig?.manualNames}
                    onChange={(checked) =>
                      handleCounterConfigChange("manualNames", checked)
                    }
                    className="!h-5 sm:!h-6 !min-w-[40px] sm:!min-w-[44px] [&>.ant-switch-handle]:!w-4 [&>.ant-switch-handle]:!h-4 
                      sm:[&>.ant-switch-handle]:!w-5 sm:[&>.ant-switch-handle]:!h-5 
                      [&>.ant-switch-handle]:!top-0.5 
                      !bg-gray-300 hover:!bg-gray-400 
                      [&.ant-switch-checked]:!bg-ocean-blue [&.ant-switch-checked]:hover:!bg-ocean-blue/90"
                  />
                  <span className="text-sm">Manual Counter Names</span>
                </div>
              </div>

              {/* Manual Counter Names */}
              {newQueue.counterConfig?.manualNames && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newQueue.counterConfig.counters.map((counter) => (
                    <div key={counter.id}>
                      <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                        Counter {counter.id} Name
                      </label>
                      <Input
                        value={counter.name}
                        onChange={(e) =>
                          handleCounterNameChange(counter.id, e.target.value)
                        }
                        className="border-ocean-blue border-2 sm:border-4 w-full bg-white/50 rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-2">
                <Button
                  onClick={() => {
                    setIsAddingQueue(false);
                    setIsEditingQueue(null);
                    setNewQueue({
                      isActive: true,
                      counterConfig: {
                        startNumber: 1,
                        increment: 1,
                        numberOfCounters: 1,
                        manualNames: false,
                        counters: [],
                      },
                    });
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-300 text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={isEditingQueue ? handleUpdateQueue : handleAddQueue}
                  className="w-full sm:w-auto !bg-gradient-to-r !from-baby-blue !to-ocean-blue hover:!opacity-90 
                    !text-white !border-0 !rounded-lg sm:!rounded-xl px-4 py-1.5 sm:py-2 text-sm sm:text-base"
                >
                  {isEditingQueue ? "Update Queue" : "Add Queue"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Add Queue Button */}
          {!isAddingQueue && (
            <Button
              onClick={() => setIsAddingQueue(true)}
              icon={<FaPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />}
              className="!bg-gradient-to-r !from-baby-blue !to-ocean-blue hover:!opacity-90 
                !text-white !border-0 !rounded-lg sm:!rounded-xl w-full !h-10 sm:!h-12 
                !text-sm sm:!text-base"
            >
              Add New Queue
            </Button>
          )}
        </div>
      </QueueModal>
    </Entity>
  );
}

export default withRoleProtection(QueuesPage, "view_queues");
