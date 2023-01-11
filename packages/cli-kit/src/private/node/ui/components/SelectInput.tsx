import {isEqual} from '../../../../public/common/lang.js'
import {groupBy, partition} from '../../../../public/common/collection.js'
import {mapValues} from '../../../../public/common/object.js'
import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Box, Key, useInput, Text} from 'ink'
import {debounce} from '@shopify/cli-kit/common/function'

export interface Props<T> {
  items: Item<T>[]
  onChange: (item: Item<T>) => void
  enableShortcuts?: boolean
  focus?: boolean
}

export interface Item<T> {
  label: string
  value: T
  key?: string
  group?: string
}

interface ItemWithIndex<T> extends Item<T> {
  index: number
}

function groupItems<T>(items: Item<T>[]): [{[key: string]: ItemWithIndex<T>[]}, ItemWithIndex<T>[]] {
  let index = 0

  const [withGroup, withoutGroup] = partition(items, 'group')

  const withGroupMapped = mapValues(groupBy(withGroup, 'group'), (groupItems) =>
    groupItems.map((groupItem) => {
      const item = {...groupItem, key: groupItem.key ?? (index + 1).toString(), index}
      index += 1
      return item
    }),
  )
  const withoutGroupMapped = withoutGroup.map((item) => {
    const newItem = {...item, key: item.key ?? (index + 1).toString(), index}
    index += 1
    return newItem
  })

  return [withGroupMapped, withoutGroupMapped]
}

interface SelectItemsGroupProps<T> {
  title: string | undefined
  items: ItemWithIndex<T>[]
  selectedIndex: number
  hasMarginTop: boolean
  enableShortcuts: boolean
}

function SelectItemsGroup<T>({
  title,
  items,
  selectedIndex,
  hasMarginTop,
  enableShortcuts,
}: SelectItemsGroupProps<T>): JSX.Element {
  return (
    <Box key={title} flexDirection="column" marginTop={hasMarginTop ? 1 : 0}>
      {title && (
        <Box marginLeft={3}>
          <Text bold>{title}</Text>
        </Box>
      )}

      {items.map((item) => {
        const isSelected = item.index === selectedIndex

        return (
          <Box key={item.key}>
            <Box marginRight={2}>{isSelected ? <Text color="cyan">{`>`}</Text> : <Text> </Text>}</Box>

            <Text color={isSelected ? 'cyan' : undefined}>
              {enableShortcuts ? `(${item.key}) ${item.label}` : item.label}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}

export default function SelectInput<T>({
  items,
  onChange,
  enableShortcuts = true,
  focus = true,
}: React.PropsWithChildren<Props<T>>): JSX.Element | null {
  const [inputStack, setInputStack] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const keys = useRef(new Set(items.map((item) => item.key)))
  const [groupedItems, ungroupedItems] = groupItems(items)
  const groupedItemsValues = [...Object.values(groupedItems).flat(), ...ungroupedItems]
  const groupTitles = Object.keys(groupedItems)
  const previousItems = useRef<Item<T>[]>(items)

  const changeSelection = useCallback(
    (index: number) => {
      const groupedItem = groupedItemsValues.find((item) => item.index === index)!
      setSelectedIndex(index)
      onChange(items.find((item) => item.value === groupedItem.value)!)
    },
    [items],
  )

  // reset index when items change
  useEffect(() => {
    if (
      !isEqual(
        previousItems.current.map((item) => item.value),
        items.map((item) => item.value),
      )
    ) {
      changeSelection(0)
    }

    previousItems.current = items
  }, [items])

  const handleArrows = useCallback(
    (key: Key) => {
      if (key.upArrow) {
        const lastIndex = items.length - 1

        changeSelection(selectedIndex === 0 ? lastIndex : selectedIndex - 1)
      } else if (key.downArrow) {
        changeSelection(selectedIndex === items.length - 1 ? 0 : selectedIndex + 1)
      }
    },
    [selectedIndex, items],
  )

  const handleShortcuts = useCallback(
    (input: string) => {
      const parsedInput = parseInt(input, 10)

      if (parsedInput !== 0 && parsedInput <= items.length + 1) {
        changeSelection(parsedInput - 1)
      } else if (keys.current.has(input)) {
        const groupedItem = groupedItemsValues.find((item) => item.key === input)
        if (groupedItem !== undefined) {
          changeSelection(groupedItem.index)
        }
      }
    },
    [items],
  )

  const debounceHandleShortcuts = useCallback(
    debounce((newInputStack) => {
      handleShortcuts(newInputStack)
      setInputStack(null)
    }, 300),
    [setInputStack],
  )

  useInput(
    (input, key) => {
      // check that no key is being pressed
      if (enableShortcuts && input.length > 0 && Object.values(key).every((value) => value === false)) {
        const newInputStack = inputStack === null ? input : inputStack + input

        setInputStack(newInputStack)

        debounceHandleShortcuts(newInputStack)
      } else {
        handleArrows(key)
      }
    },
    {isActive: focus},
  )

  const ungroupedItemsTitle = groupTitles.length > 0 ? 'Other' : undefined

  return (
    <Box flexDirection="column">
      {groupTitles.map((title, index) => (
        <SelectItemsGroup
          title={title}
          selectedIndex={selectedIndex}
          items={groupedItems[title]!}
          key={title}
          hasMarginTop={index !== 0}
          enableShortcuts={enableShortcuts}
        ></SelectItemsGroup>
      ))}

      {ungroupedItems.length > 0 && (
        <SelectItemsGroup
          title={ungroupedItemsTitle}
          selectedIndex={selectedIndex}
          items={ungroupedItems}
          hasMarginTop={groupTitles.length > 0}
          enableShortcuts={enableShortcuts}
        ></SelectItemsGroup>
      )}

      <Box marginTop={1} marginLeft={3}>
        <Text dimColor>navigate with arrows, enter to select</Text>
      </Box>
    </Box>
  )
}
