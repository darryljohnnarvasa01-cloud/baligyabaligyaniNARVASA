<?php

namespace App\Exceptions;

use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    public function __construct(private readonly string $itemName)
    {
        parent::__construct('Insufficient stock for: '.$itemName);
    }

    public function getItemName(): string
    {
        return $this->itemName;
    }
}

